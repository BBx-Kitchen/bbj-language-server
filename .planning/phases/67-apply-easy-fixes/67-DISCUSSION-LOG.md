# Phase 67: Apply Easy Fixes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-19
**Phase:** 67-apply-easy-fixes
**Mode:** interactive (default)
**Areas discussed:** The apply denominator, FIX-03 green-suite gate, FIX-02 regression tests, Unverifiable-locally fixes

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| The apply denominator | Is the set exactly the 77 easy-fix records minus the 2 self-excluded INVENTORY ones? Duplicate at `bbj-type-inferer.ts:75-76`? Closed denominator artifact? | ✓ |
| FIX-03 green-suite gate | Literal "clean" unreachable: 11 env failures, flaky hook timeouts, 2 lint warnings, JDK-25 gradle abort | ✓ |
| FIX-02 regression tests | Which of ~75 are "behavior-changing"? How to prove "fails before"? | ✓ |
| Unverifiable-locally fixes | 10 in `bbj-intellij/` (no JDK 17); workflows and lockfile where vitest proves nothing | ✓ |

**User's choice:** all four.
**Notes:** Two further areas were named as open at this point — commit/plan grouping and the FIX-04 / `EASY-FIXES.md` timing — and offered again at the close.

---

## The apply denominator

### Q1 — How to fix the denominator

| Option | Description | Selected |
|--------|-------------|----------|
| Derived artifact, `67-APPLY-SET.md` | Mechanically derive from the six COVERAGE files; numbered ledger, per-row apply/exclude verdict; same shape as Phases 65/66 constructed denominators | ✓ |
| Inline in PLAN.md must_haves | Union across plans is the denominator; completeness only provable by summing plans | |
| Reuse Phase 68's EASY-FIXES.md | Phase 67 creates it early as its worklist; crosses the Phase 66 D-01 boundary | |

**User's choice:** Derived artifact, `67-APPLY-SET.md` → **D-01**.

### Q2 — The duplicate pair

| Option | Description | Selected |
|--------|-------------|----------|
| One commit, both IDs cited | Apply once; commit references both `P61-D2-011` and `P66-D2-001`; ledger records the merge | ✓ |
| Two commits, second a no-op record | Strict 1:1 finding-to-commit, but manufactures a commit that changes nothing | |
| Apply under `P66-D2-001` only | Later re-triage supersedes the Phase 61 record | |

**User's choice:** One commit, both IDs cited → **D-04**.
**Notes:** Established by reading both records: `P66-D2-001` is Phase 66's DEBT-03 re-triage, names the identical edit in `getTypeInternal`'s `isJavaMethod` branch, and cites `P61-D2-011` by ID as the original reproduction. `P61-D5-009` covers the same lines but is a separate D5 record.

### Q3 — Which trees are in scope

| Option | Description | Selected |
|--------|-------------|----------|
| Everything except INVENTORY.md | All 75: `bbj-vscode/` src+test, `bbj-intellij/`, 3 `CLAUDE.md`, 3 workflows, 2 lockfile. Only the 2 self-excluded INVENTORY records are out | ✓ |
| Source and tests only | Defers 8 findings with no reason of their own | |
| All except CI-affecting | Defers only the 3 workflow edits | |

**User's choice:** Everything except INVENTORY.md → **D-02**, **D-03**.

### Q4 — The easy/major sequencing coupling

| Option | Description | Selected |
|--------|-------------|----------|
| Apply it, record the departure | Apply `P64-D4-004` alone; record that the "alongside `P64-D3-002`" note could not be honoured because that finding is major and out of scope | ✓ |
| Defer it to match the note | Honours the aside, but lets it override the classification standard | |
| Apply, and re-check for others | As option 1, plus a sweep of all 75 for other couplings | |

**User's choice:** Apply it, record the departure → **D-06**.
**Notes:** Both edit `build.yml`'s `on:` block. `P64-D3-002` is `major-refactor` and routes to Phase 68.

---

## FIX-03 green-suite gate

### Q1 — How to discharge an unreachable requirement

| Option | Description | Selected |
|--------|-------------|----------|
| Baseline-delta, honestly stated | "No new failure vs. a recorded pre-change baseline"; close-out states plainly that literal cleanliness was not achieved and why | ✓ |
| Amend FIX-03 in REQUIREMENTS.md | Record and reality agree, but edits a requirement mid-milestone | |
| Targeted-suite gate | Only touched test files must be green; whole-suite runs are evidence, not gate | |
| Fix the environment first | Stand up java-interop, install a supported JDK | |

**User's choice:** Baseline-delta, honestly stated → **D-07**.
**Notes:** Grounded in `INVENTORY.md` §"Test & Build Baseline", which already records the 11 named interop failures, the two-run variance, and the JDK gap. Same honesty shape as Phase 66 D-01/D-02 for DEBT-06. FIX-03's text is not edited.

### Q2 — How to capture the baseline given run-to-run variance

| Option | Description | Selected |
|--------|-------------|----------|
| Named-test set, not counts | Compare failing test names; hook-timeout suites recorded as flaky and excluded with a per-occurrence argument | ✓ |
| Best-of-N runs | 3× before, 3× after; fails only if it fails every run. 6 full runs | |
| Raise `hookTimeout` first | Removes noise at source, but is itself an untracked behaviour change | |

**User's choice:** Named-test set, not counts → **D-08**.

### Q3 — Suite cadence across ~74 commits

| Option | Description | Selected |
|--------|-------------|----------|
| Targeted per commit, full per plan | `npx vitest run <touched files>` + `npm run build` per commit; full baseline-delta per PLAN.md and at close | ✓ |
| Full suite every commit | Sharpest attribution, ~74 full runs, re-rolls the flaky dice each time | |
| Full suite at phase close only | Cheapest; bisecting 74 commits costs more than the runs saved | |

**User's choice:** Targeted per commit, full per plan → **D-09**.

### Q4 — The 2 pre-existing lint warnings

| Option | Description | Selected |
|--------|-------------|----------|
| Same baseline-delta rule | Record the 2 warnings, require no new ones | |
| Clear them as part of the file's fixes | Fold into a commit on `bbj-document-symbol-provider.ts` | ✓ |
| Separate untracked commit | Housekeeping commit outside the finding set | |

**User's choice:** Clear them as part of the file's fixes → **D-10**.
**Notes:** The option was presented with a caveat that it might ship an edit no finding ID authorises. Reading the record showed that caveat to be wrong: `P61-D4-010` *is* the finding for those two stale `eslint-disable` directives at lines 75 and 149 — its `evidence:` field is literally the two `npm run lint` warnings. So lint reaches literal cleanliness via a finding-keyed commit, with no untracked edit and no tension with FIX-01 or FIX-04.

---

## FIX-02 regression tests

### Q1 — Defining "behaviour-changing"

| Option | Description | Selected |
|--------|-------------|----------|
| Dimension-driven, per-record override | D2/D3/D7 require a test; D4/D8 do not; D5's fix is the test; D6 verifies by build. Records contradicting their dimension override it, argued in the ledger | ✓ |
| Per-record judgement only | Most accurate; 75 judgement calls with no stated standard | |
| Test everything applicable | Maximum safety; produces tests asserting comment text | |

**User's choice:** Dimension-driven, per-record override → **D-11**.
**Notes:** Dimension legend taken from `INVENTORY.md` §3b. Apply-set mix: D2 ×25, D8 ×17, D5 ×13, D4 ×11, D3 ×4, D6 ×3, D7 ×1 — 30 fixes require a regression test.

### Q2 — Proving "fails before the fix"

| Option | Description | Selected |
|--------|-------------|----------|
| Test-first, two commits per fix | Red test commit, then fix commit; red state permanently re-checkable in git history | ✓ |
| One commit, recorded transcript | Keeps 1 fix = 1 commit; proof is a transcript, not a re-runnable state | |
| Fix-then-test, revert check | Simplest; weakest evidence | |

**User's choice:** Test-first, two commits per fix → **D-12**.

### Q3 — Reconciling that with FIX-01's "own atomic commit"

| Option | Description | Selected |
|--------|-------------|----------|
| Commit pair is the atomic unit | Both commits carry the same finding ID; ledger records the pair; reading stated explicitly for verify-phase | ✓ |
| Amend FIX-01 too | Record and reality agree; edits a second requirement mid-milestone | |
| Batch all red tests first | Fewest commits; leaves the tree red across a wave and breaks attribution | |

**User's choice:** Commit pair is the atomic unit → **D-12**.

### Q4 — D5 test-coverage gaps, where no red state is possible

| Option | Description | Selected |
|--------|-------------|----------|
| Single commit, no red required | Ledger records FIX-02's fail-before clause as inapplicable, with the reason | ✓ |
| Mutation-check the new test | Break the covered code, confirm the test fails, restore, record. Stronger, costlier across 13 | |
| Fold into the nearest behaviour fix | Reuse the D5 test as another finding's regression test | |

**User's choice:** Single commit, no red required → **D-13**.

---

## Unverifiable-locally fixes

### Q1 — The 10 `bbj-intellij/` fixes

| Option | Description | Selected |
|--------|-------------|----------|
| Apply, verify by review, record the gap | Apply all 10, verify against each finding's named edit, record that no compile or test ran and why | ✓ |
| Apply doc-only, defer the rest | Apply the 6 D8 fixes; defer 4 | |
| Install a JDK 17 first | Best evidence; adds environment provisioning to the phase | |
| Defer all 10 to a follow-up | Cleanest verification claim; leaves a whole tree unapplied | |

**User's choice:** Apply, verify by review, record the gap → **D-14**.
**Notes:** Verified during discussion that no alternative JDK exists — `/usr/lib/jvm` is empty, no SDKMAN, `JAVA_HOME=/opt/java/default` is Temurin 25.0.3, and `build.gradle.kts` sets source/target compatibility to `JavaVersion.VERSION_17`. All 10 records are `low` severity; 8 of 10 are D8 comment or D4 naming edits.

### Q2 — `P63-D7-004`, the one behaviour-adjacent IntelliJ fix

| Option | Description | Selected |
|--------|-------------|----------|
| Per-record override, argued | Record the regression test as unachievable, name the test that would prove it | |
| Test the VS Code side of the parity | Assert the shared contract via vitest if a counterpart exists | |
| Defer this one fix | Apply the other 9; hold this one until it can be tested | ✓ |

**User's choice:** Defer this one fix → **D-15**.
**Notes:** This is the only `easy-fix` record excluded for a reason Phase 67 originates; the two INVENTORY exclusions come from the reviewers' own recorded text.

### Q3 — Lockfile and workflow fixes

| Option | Description | Selected |
|--------|-------------|----------|
| Tool-native checks, no invented tests | Lockfile: `npm ci` + `npm audit` + baseline-delta. Workflows: YAML parse + `actionlint` if available. Ledger records that no CI run occurred | ✓ |
| Workflow fixes need a real CI run | Push a branch, let Actions prove it | |
| Same review-only treatment as IntelliJ | No tool checks beyond the suite run | |

**User's choice:** Tool-native checks, no invented tests → **D-16**.

---

## Close

| Option | Description | Selected |
|--------|-------------|----------|
| Ready for context | Write CONTEXT.md now | ✓ |
| Explore more gray areas | Discuss plan/wave grouping and the FIX-04 / EASY-FIXES.md timing | |

**User's choice:** Ready for context. The two undiscussed areas were recorded under Claude's Discretion with stated, correctable defaults rather than left open.

---

## Claude's Discretion

- **Plan and wave grouping** — default: group by tree and file so no two agents edit one file
  concurrently; serialize multi-fix files (`java-interop.ts` ×7, and six files with ×3) inside a
  single plan; ledger construction is wave 1.
- **FIX-04 and the Phase 67 / 68 boundary** — default: Phase 67 does **not** create
  `EASY-FIXES.md` (Phase 68's DOC-01). Each `67-APPLY-SET.md` row carries the exact fields DOC-01
  needs, and the close-out states that FIX-04 becomes literally true when Phase 68 assembles —
  mirroring Phase 66 D-02's treatment of DEBT-06.

## Deferred Ideas

- `P63-D7-004` — deferred within this phase (D-15), applies unchanged once a JDK 17 exists.
- Provisioning a JDK 17 — raised, rejected as environment provisioning rather than applying fixes.
- Raising vitest's `hookTimeout` — raised as a way to remove the D-08 flakiness at source;
  rejected as an untracked behaviour change with no finding ID behind it.
- The 144 `major-refactor` findings — Phase 68 documents, Phase 69 files. Not this phase.
