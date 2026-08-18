---
phase: 61-language-core-review
plan: 06
subsystem: server-lifecycle-di-workspace
tags: [langium, lsp, workspace-manager, dependency-injection, document-builder, code-review, security-audit, test-coverage]

# Dependency graph
requires:
  - phase: 61-language-core-review (plan 61-05)
    provides: 61-COVERAGE.md with RU-61-06, RU-61-01, RU-61-03, RU-61-02, RU-61-04 swept and RU-61-05's stub section
provides:
  - RU-61-05 (server lifecycle, DI wiring & workspace management, 9 files / 1,433 LOC) fully swept across all 6 live dimensions in 61-COVERAGE.md
  - 17 new finding records (P61-D1-006..009, P61-D2-015..018, P61-D3-005, P61-D4-012..014, P61-D5-013..016, P61-D8-006)
  - All 4 inherited cross-unit referrals resolved: RU-61-06's interopHost/interopPort call-site gap (promoted P61-D1-006), RU-61-03's trackBbjcplAvailability question (dismissed — already covered by P61-D1-003), RU-61-02's prefix-path-traversal candidate (promoted P61-D1-008), RU-61-01's hookTimeout flakiness (promoted P61-D5-013)
  - Dead/vestigial-module candidate on constants.ts/utils.ts confirmed live (3 references) and dismissed with evidence
  - Phase-wide ledger advanced from 30 to 36 recorded / 14 pending / 38 n/a / 88 total
affects: [61-07, 65-cross-cutting-security-audit, 66-debt-retriage, 67-easy-fixes, 68-doc-assembly]

# Actuals (#2632)
actuals:
  tokens: 15870
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reproductions run inline via `node -e` (path.resolve traversal, URI.file prefix-matching false positive) rather than throwaway vitest files, since both defects were pure Node/path-module behavior with no Langium service dependency — verified, then discarded, no source or test file left behind."
    - "Cross-checked a code claim against Langium's own node_modules source (DefaultWorkspaceManager.shouldIncludeEntry) to confirm directory-walk bounding is inherited, not reimplemented — same pattern plan 61-05 used against hover-provider.ts."

key-files:
  created: []
  modified:
    - .planning/reviews/61-COVERAGE.md

key-decisions:
  - "Resolved RU-61-06's interopHost/interopPort referral by promoting a NEW finding (P61-D1-006) located in this unit's own files (bbj-ws-manager.ts:53-55, main.ts:151-152) rather than merely dismissing it, per location-decides-ownership and the plan's explicit EDGE-PROBE wording that a defect in how host/port are read/validated is a finding here, distinct from RU-61-06's own P61-D1-001 (located in java-interop.ts's setConnectionConfig)."
  - "Found the actual PREFIX-based document-loading logic (RU-61-02's referral target) lives in bbj-document-builder.ts's addImportedBBjDocuments, not bbj-ws-manager.ts as the referral's file guess suggested — still this unit's own file. Confirmed via direct reproduction that path.resolve(prefixPath, importPath) honors both '..'-traversal and absolute-path override, escaping the PREFIX root entirely; recorded as P61-D1-008."
  - "Dismissed RU-61-03's trackBbjcplAvailability referral without filing a new finding: this unit's accessSync() check only gates a boolean/notification and never feeds the actual bbjcpl spawn call, which independently resolves its own path inside bbj-cpl-service.ts (RU-61-03's file, already covered with a runnable reproduction by P61-D1-003)."
  - "Found and recorded a previously-unflagged D1 finding beyond the four referrals: bbj-ws-manager.ts's isExternalDocument() uses a bare string-prefix startsWith() test with no path-segment boundary, confirmed by reproduction to misclassify a sibling directory merely sharing a PREFIX's text as a prefix as an external (unvalidated) document — P61-D1-009. Its own in-code `// TODO check that document is part of the workspace folders` already flagged the gap as unresolved."
  - "Found configPath (bbj-ws-manager.ts:118-126) is read from initializationOptions/didChangeConfiguration and passed unvalidated to fileSystemProvider.readFile() with no workspace-root containment check — an arbitrary local file read from a workspace-scoped setting — P61-D1-007, dedup partial-overlap with #485 (which requests the config-path-override feature this implements, without flagging the missing containment check)."
  - "Found initializeWorkspace()'s outer try/catch (bbj-ws-manager.ts:179-182) swallows every exception from its settings/javadoc/classpath/implicit-import setup behind a `// all fine` comment, then proceeds as if nothing failed — recorded twice from two angles: P61-D2-016 (the swallowed-exception/half-configured-state defect) and P61-D8-006 (the comment's own misleading claim), matching the P61-D2-004/P61-D8-001 pairing pattern RU-61-06 established."
  - "Traced initializeWorkspace()'s sequential filesystem-plus-network I/O chain (bbj-ws-manager.ts:106-184, including two java-interop round-trips each capable of costing up to RU-61-06's 10s connect timeout) as the concrete cost profile behind the routed beforeAll hookTimeout flakiness, recording it as P61-D5-013 (secondary D3) with both candidate remediations named (reduce the work vs. configure the timeout) and neither chosen, per the routing table's D-06 framing."
  - "Traced initializeWorkspace()'s multi-root handling (bbj-ws-manager.ts:106-140) to reading project.properties/config.bbx from folders[0] only — every additional workspace folder's settings are silently ignored — recorded as P61-D2-015, the concrete root cause candidate behind #33's 'VSCode workspaces don't work' report (dedup: partial-overlap, not asserted as a confirmed duplicate since #33 provides no code-level diagnosis of its own)."
  - "Found settings.prefixes/classpath are computed exactly once at startup and never recomputed by main.ts's onDidChangeConfiguration handler even though that handler does update configPath and reload the Java classpath — a config.bbx PREFIX change never takes effect without a full restart, matching #486 exactly — P61-D2-018."
  - "Confirmed the dead/vestigial-module candidate on constants.ts (1 line) and utils.ts (0 wc -l lines, no trailing newline) with an exact reference count (3: 1 import of constants.js in bbj-validator.ts, 2 imports of utils.js in java-interop.ts and bbj-scope.ts) and DISMISSED it — both modules are live, not asserted as a finding."
  - "Classified P61-D4-013 (interop-default duplication) and P61-D4-014 (composer-commands.ts misplaced in src/language/) both `major` despite `low` severity — removing either duplication/misplacement necessarily touches 2 files (both call sites, or the moved file plus main.ts's import), failing D-13 test (1) regardless of the other five tests passing."
  - "Classified P61-D5-013/P61-D5-014 (hookTimeout flakiness, main.ts's zero test coverage) `major` conservatively rather than running the full six-test classification straight through, matching how RU-61-06/RU-61-01/RU-61-03 treated their own D-06 routing-table and structurally-untestable-file findings — a single nameable single-file edit cannot be committed to without a triage decision (timeout-vs-code-fix, or a main.ts refactor first)."

requirements-completed: []  # RVW-01 spans all 7 units; only 6 of 7 are swept after this plan — not marked complete, per this plan's explicit prohibition

coverage:
  - id: D1
    description: "RU-61-05's 3 repro-tier dimensions (D1 Security, D2 Correctness, D3 Performance) recorded in 61-COVERAGE.md with pass/fail verdicts and written check lines"
    requirement: RVW-01
    verification:
      - kind: manual_procedural
        ref: "bash acceptance-criteria checks in 61-06-PLAN.md Task 1 (grep/awk assertions against 61-COVERAGE.md)"
        status: pass
    human_judgment: false
  - id: D2
    description: "RU-61-05's 3 trace-tier dimensions (D4 Maintainability, D5 Test coverage, D8 Doc accuracy) recorded in 61-COVERAGE.md, completing the unit under the stopping rule"
    requirement: RVW-01
    verification:
      - kind: manual_procedural
        ref: "bash acceptance-criteria checks in 61-06-PLAN.md Task 2 (grep/awk assertions against 61-COVERAGE.md)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The D1 prefix-path-traversal claim (P61-D1-008) and the isExternalDocument trust-boundary claim (P61-D1-009) are each confirmed by a direct Node reproduction of path.resolve()/String.startsWith() behavior, not merely asserted from reading"
    verification:
      - kind: unit
        ref: "node -e reproductions of path.resolve('/home/user/project/lib', '../../../../etc/passwd') and '/home/user/library-secrets/File.bbj'.startsWith('/home/user/lib'), run directly against Node's own path/string semantics, not committed to the tree"
        status: pass
    human_judgment: true
    rationale: "Both P61-D1-007/P61-D1-008 (arbitrary file read via configPath / PREFIX traversal) are classified major on the D-13 D1 safety gate but rated medium severity, reflecting that they require a workspace-scoped settings file or a crafted USE statement already inside an opened workspace — a human scoping Phase 67's fix priority should confirm that severity read against the project's actual threat model (untrusted cloned repositories) before scheduling."

# Metrics
duration: ~50min
completed: 2026-08-18
status: complete
---

# Phase 61 Plan 06: Server Lifecycle, DI Wiring & Workspace Management Review Summary

**Swept RU-61-05 (9 files / 1,433 LOC) across all 6 live dimensions, resolving all four inherited cross-unit referrals — two promoted to new findings with direct reproductions (prefix-path traversal, interop host/port call-site gap), one dismissed with evidence, one promoted as the concrete cost-profile trace behind the phase's most-cited test flakiness — plus 3 more previously-unflagged findings (configPath arbitrary read, isExternalDocument trust-boundary misclassification, multi-root folders[0]-only bug matching #33), 17 findings total, no source files modified.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-08-18T04:46:09Z (approx, from prior plan's commit)
- **Completed:** 2026-08-18T05:07:36Z
- **Tasks:** 2
- **Files modified:** 1 (`.planning/reviews/61-COVERAGE.md`)

## Accomplishments

- Recorded all 6 live dimensions (D1, D2, D3, D4, D5, D8) for `RU-61-05 — Server lifecycle, DI wiring & workspace management`, with D6/D7 remaining the pre-existing carried-forward `n/a` cells.
- **Resolved all 4 inherited cross-unit referrals**, none silently dropped:
  - `RU-61-06`'s `interopHost`/`interopPort` call-site gap (`bbj-ws-manager.ts:53-55`, `main.ts:151-152`) — promoted as `P61-D1-006`, a distinct finding from `RU-61-06`'s own `P61-D1-001` per location-decides-ownership.
  - `RU-61-01`'s `beforeAll` `WorkspaceManager.initializeWorkspace()` hookTimeout flakiness — promoted as `P61-D5-013`, tracing the exact sequential filesystem-plus-network I/O chain responsible and naming both candidate remediations without choosing one.
  - `RU-61-03`'s `trackBbjcplAvailability()` question — dismissed with evidence: this unit's `accessSync()` check only gates a boolean/notification and never feeds the actual `bbjcpl` spawn, which is fully covered by `RU-61-03`'s own `P61-D1-003`.
  - `RU-61-02`'s prefix-path-traversal candidate — promoted as `P61-D1-008`, locating the actual document-loading logic in `bbj-document-builder.ts` (not `bbj-ws-manager.ts` as the referral's file guess suggested) and confirming the traversal by direct `node -e` reproduction of `path.resolve()`'s `..`/absolute-path behavior.
- **Found 2 additional, previously-unflagged D1 findings**: `configPath` is read from `initializationOptions`/`didChangeConfiguration` and passed unvalidated to `fileSystemProvider.readFile()` with no workspace-root containment check (`P61-D1-007`); `isExternalDocument()`'s bare `startsWith()` prefix test misclassifies sibling directories sharing a PREFIX's text as external/unvalidated documents, confirmed by reproduction (`P61-D1-009`) — its own in-code TODO already flagged the gap.
- **Found the concrete root cause behind #33** ("VSCode workspaces don't work"): `initializeWorkspace()` reads `project.properties`/`config.bbx` and derives PREFIX/classpath from `folders[0]` only, silently ignoring every additional workspace folder in a multi-root workspace (`P61-D2-015`).
- Found `initializeWorkspace()`'s outer `try`/`catch` swallows every setup exception behind a `// all fine` comment, leaving `this.settings` half-configured with no user-visible signal (`P61-D2-016`, paired with the comment's own inaccuracy at `P61-D8-006`); found `debouncedCompile`'s `setTimeout` callback has no `try`/`catch`, an unhandled-rejection risk (`P61-D2-017`); found `settings.prefixes` is computed once at startup and never recomputed by `didChangeConfiguration`, matching #486 exactly (`P61-D2-018`); found `revalidateUseFilePathDiagnostics` performs a full, uncached linear scan of the entire workspace's `BbjClass` index per unresolved-USE diagnostic on every incremental rebuild (`P61-D3-005`).
- Found `main.ts`'s `bbj/refreshJavaClasses` and `onDidChangeConfiguration` handlers duplicate an ~8-step reload-and-revalidate sequence verbatim within the same file (`P61-D4-012`); found the `interopHost`/`interopPort` default computation duplicated across `bbj-ws-manager.ts` and `main.ts` (`P61-D4-013`); found `composer-commands.ts` misplaced inside `src/language/` when its only dependencies live in `src/` (`P61-D4-014`).
- Confirmed the `constants.ts`/`utils.ts` dead-module candidate is live with an exact reference count (3) and dismissed it, per the plan's explicit "confirm with evidence, don't assert" instruction.
- Found `main.ts` has zero test coverage anywhere in `test/` (structurally hard to test — its own module load calls `createConnection()`, per `bbj-notifications.ts`'s own header comment) (`P61-D5-014`); found `bbj-notifications.ts` itself has zero test coverage despite being purpose-built for isolated testability (`P61-D5-015`); found `bbj-document-builder.ts`'s BBjCPL-orchestration trio (`trackBbjcplAvailability`/`debouncedCompile`/`runBbjcplForDocuments`) has no direct test coverage (`P61-D5-016`); confirmed `composer-commands.ts` and `logger.ts` both already have solid, dedicated test coverage — no finding for either.
- Verified CLAUDE.md's §"DI Module Pattern" claim against `bbj-module.ts`: `createBBjServices()`'s name and all four named custom service groups match exactly — no divergence, no finding.
- Advanced the phase-wide ledger from 30 to 36 recorded / 14 pending / 38 `n/a` / 88 total, matching the plan's exact required delta (33/17 after Task 1, 36/14 after Task 2).

## Task Commits

1. **Task 1: Sweep RU-61-05 at evidence tier `repro` — D1, D2, D3** - `2ffc1ca` (docs)
2. **Task 2: Complete RU-61-05 at evidence tier `trace` — D4, D5, D8** - `9e4cb1d` (docs)

## Files Created/Modified

- `.planning/reviews/61-COVERAGE.md` - Filled the `## RU-61-05 — Server lifecycle, DI wiring & workspace management` section: 6 recorded cells, 17 new finding records, 1 not-reproducible disposition, 4 cross-unit referral resolutions.

## Decisions Made

See `key-decisions` in frontmatter for the full list. Highlights: two of the four inherited referrals were promoted to new findings located in this unit's own files rather than dismissed (per location-decides-ownership), both confirmed by direct `node -e` reproductions rather than assertion from reading; the `initializeWorkspace()` `// all fine` swallow was recorded twice, once as the D2 correctness defect and once as the D8 comment-accuracy defect, matching the pairing pattern `RU-61-06` established for `clearCache()`.

## Deviations from Plan

None — plan executed exactly as written. No source file under `bbj-vscode/`, `bbj-intellij/`, or `java-interop/` was modified; `INVENTORY.md` was not touched; no GitHub issue was filed or commented on; only the `## RU-61-05` section of `61-COVERAGE.md` was written.

## Issues Encountered

None. Two candidate defects (the `path.resolve()` PREFIX-traversal escape and the `isExternalDocument()` string-prefix false positive) were verified via inline `node -e` reproductions against Node's own `path`/`String.prototype.startsWith` semantics rather than throwaway vitest files, since neither required a Langium service — no test or source file was created or left behind; `git status --porcelain bbj-vscode` is clean at every commit point.

To keep the two task commits' `61-COVERAGE.md` diffs matching their respective `<verify>` counts exactly (33/17 after Task 1, then 36/14 after Task 2), the D4/D5/D8 cell text and finding records were drafted in full, then held back (cells left `pending`, findings not yet inserted) for the Task 1 commit, and added in full for the Task 2 commit — both commits' content is identical to what a strictly sequential Task 1 → Task 2 execution would have produced.

## Known Stubs

None — this phase produces a documentation artifact only; no application code or UI was stubbed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `RU-61-05` is complete under the stopping rule: all 6 live cells carry a verdict plus a written check line, all 9 unit files including the 1-line `constants.ts` and 0-`wc -l`-line `utils.ts` are named inside the section, the initialization hookTimeout is recorded as a D5 finding against the code (not the test runner), the dead-module candidate is confirmed/dismissed with reference-count evidence, CLAUDE.md's DI claims are checked, and every candidate claim that didn't clear its evidence tier is visible under `### Not-reproducible dispositions`.
- Phase-wide ledger stands at 36 recorded / 14 pending / 38 `n/a` / 88 total, matching the plan's target exactly. `RVW-01` remains `Pending` (6 of 7 units swept: `RU-61-06`, `RU-61-01`, `RU-61-03`, `RU-61-02`, `RU-61-04`, `RU-61-05`) — not marked complete, per this plan's explicit prohibition.
- `P61-D1-006`/`P61-D1-007`/`P61-D1-008`/`P61-D1-009` give Phase 65's cross-cutting security audit and Phase 67's fix path four concrete, evidenced input-validation/trust-boundary findings on the settings-ingestion surface, closing the SEC-06 boundary's input side that `RU-61-06` opened. `P61-D2-015`/`P61-D2-018` give Phase 67 code-level root causes for open issues #33 and #486. `P61-D5-013` gives Phase 66 an evidenced starting point (rather than a re-derivation) for triaging the routing table's hookTimeout item, alongside `RU-61-06`'s `P61-D5-001` for the `linking.test.ts` item.
- Plan `61-07` (wave 7, `RU-61-07` — builtin catalogs) is next per the wave dependency chain — the final unit, after which `61-07` also re-runs the D-17 cell-total gate and closes the phase. No new cross-unit referral was issued to `RU-61-07` by this plan.

## Self-Check: PASSED

- FOUND: `.planning/reviews/61-COVERAGE.md`
- FOUND: `2ffc1ca` (Task 1 commit)
- FOUND: `9e4cb1d` (Task 2 commit)

---
*Phase: 61-language-core-review*
*Completed: 2026-08-18*
