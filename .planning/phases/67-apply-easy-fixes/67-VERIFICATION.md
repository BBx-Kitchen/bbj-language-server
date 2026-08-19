---
phase: 67-apply-easy-fixes
verified: 2026-08-19T15:56:41Z
status: human_needed
score: 3/4 roadmap success criteria directly verified, 1 deferred to Phase 68 by design
behavior_unverified: 0
overrides_applied: 0
deferred:
  - truth: "No applied fix changes user-facing behavior without that change appearing in EASY-FIXES.md (Success Criterion 4)"
    addressed_in: "Phase 68"
    evidence: "ROADMAP.md Phase 68 goal: 'Produce EASY-FIXES.md and MAJOR-REFACTORS.md with full coverage statement' — DOC-01 is explicitly the deliverable that creates this file. 67-CONTEXT.md's own D-16/Claude's-Discretion section records this boundary explicitly, and 67-APPLY-SET.md's ledger carries all 77 rows' finding_id/location/dimension/failure_scenario/fix_applied/commit/user_facing fields (29 rows flagged user_facing: yes, zero empty fields) so Phase 68 can assemble the document without re-deriving anything."
human_verification:
  - test: "Decide whether the 6 findings in 67-REVIEW.md (1 Critical, 6 Warnings) are acceptable residual risk for a phase whose own goal requires fixes be applied 'as a low-risk ... change', or whether one or more of the 5-6 newly-introduced concurrency/behavior Warnings (WR-01 LRU cache eviction racing its own cyclic resolution, WR-02 stale connection listener able to clobber a healthy reconnect, WR-03 shared-mutable cancellation token across concurrent completion requests, WR-04 lexer split widened to also break on bare \\r beyond the fix's stated CRLF/LF scope, WR-05 stale-content risk in the shared in-flight format promise, WR-06 mtime-truncation false-negative in the .lst freshness gate) warrant a fast-follow fix or a filed issue before the phase is considered fully closed."
    expected: "A human (not an LLM judgment) accepts the residual risk as documented and narrow-trigger, or requires follow-up action. This is inherently a risk-tolerance judgment call the code review itself declined to make unilaterally."
    why_human: "This is a risk-acceptance decision, not a fact the codebase can settle. I independently confirmed two of the six warnings (WR-04's split regex, WR-02's newly-added onClose/onError listeners) are real, present in the current code, and were introduced by this phase's own commits — not pre-existing. Whether that residual risk is compatible with the phase's own 'low-risk' framing is a judgment call, not a verifiable fact."
  - test: "Confirm the Critical finding CR-01 (unvalidated bbj.home spawn exposure) is correctly triaged as pre-existing/out-of-scope and appropriately routed to Phase 68 rather than requiring a Phase 67 fix"
    expected: "Human agrees this is P61-D1-003 (a major-refactor, D1-classified finding that Phase 67's own D-05 rule forbids re-triaging), correctly left untouched by this phase and now flagged at true severity for Phase 68/69 to prioritize"
    why_human: "Security-severity triage judgment; 67-REVIEW.md's own text and 67-CONTEXT.md's D-05 rule both support the routing, but confirming a Critical-severity item's disposition is a human call, not a grep."
---

# Phase 67: Apply Easy Fixes Verification Report

**Phase Goal:** Every finding classified as an easy fix across Phases 61-65 is applied as a
low-risk, regression-tested, atomically-committed change, and the full test/build suite is green
afterward.

**Verified:** 2026-08-19T15:56:41Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria — the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Each easy fix lands as its own atomic commit whose message references its finding ID | ✓ VERIFIED | Re-ran `node derive-apply-set.mjs` myself — reproduces exactly 77 rows, matching the ledger. `git log 47bb785..56d6e85 --oneline \| wc -l` = 134 commits, zero without either a finding-ID reference or a `67`/`67-NN` doc-scope prefix (checked directly, not from the ledger's own claim). All spot-checked commit shas (`382a068`, `32faeff`, `97a2e6b`) resolve via `git cat-file -e`. D-04's one merged pair (`P61-D2-011`+`P66-D2-001`, `bbj-type-inferer.ts:75-76`) is documented and defensible — one edit closing two records of the same defect, both IDs cited in both commit subjects. |
| 2 | Each behavior-changing fix has a regression test that fails on the pre-fix code and passes after | ✓ VERIFIED | D-11 classifies 30 records behaviour-changing (D2×25, D3×4, D7×1, minus the 1 deferred D7 row = 29 applied). 28/29 red-test commits confirmed by the ledger's own `git merge-base --is-ancestor` check (I did not re-run this myself for all 28, but spot-checked the D-04 pair: `382a068` (test) is a direct ancestor of `32faeff` (fix) — confirmed via `git log`). 1 exception (`P61-D2-002`) is argued in writing: the claimed failure mode was empirically retested against real `vscode-jsonrpc` and does not reproduce, so `fail_before: inapplicable` is recorded with reasoning rather than a fabricated red state. D5's 13 "test-is-the-fix" rows and D6/D2-workflow's 4 "tool-native check" rows are argued exceptions under D-13/D-16, not silent skips. |
| 3 | `npm test` and `npm run lint` are clean in `bbj-vscode/`, and `./gradlew build` succeeds in `bbj-intellij/` | ✓ VERIFIED (via CI; see note) | **Lint:** ran `npm run lint` myself — exit 0, zero warnings, matches claim exactly. **Test + build:** independently queried `gh pr view 496` (head `7998106`, current repo HEAD) — all 4 checks (`BBj CI`, `Build test VSIX`, `build-vscode`, `validate-intellij`) show `conclusion: SUCCESS`. I pulled the raw CI log for `BBj CI`'s Test step myself (`gh run view 32272441035 --log`): `Tests 966 passed \| 26 skipped (992)`, 0 failed — `linking.test.ts`'s Interop block is genuinely **skipped** (`describe.runIf(isInteropRunning)`, gated on `isPortOpen(5008)` per `test/test-helper.ts:38`), because CI has no listener on 5008. `validate-intellij` runs a real `./gradlew buildPlugin` on JDK 17 (`.github/workflows/pr-validation.yml`) and succeeds — a stronger check than the literal `./gradlew build`. **Local sandbox note:** I also ran `npm test` three times myself in this environment and reproduced the same 11 `linking.test.ts` interop failures + occasional flaky `beforeAll` timeouts on unrelated suites every time — but the count of *failed tests* never exceeded 11, and the *cause* (something already listening on port 5008 in this container, causing `shouldRunBBjTests()` to attempt the interop block instead of skipping it, then fail because no real `bbjdir` classpath is configured) is a documented, pre-existing environment quirk (matches my own memory file `bbj-ls-test-environment.md`, INVENTORY.md's baseline, and Phase 64 D-06's "opening port 5008 does not fix them"), not a defect this phase introduced. `./gradlew build` also still fails locally on the JDK-25-vs-17 version check (I did not re-run it, per instruction). **Conclusion: the requirement is environment-agnostic in its wording, and is genuinely met on the correctly-configured CI substrate.** `67-BASELINE.md`'s own close-out concludes "FIX-03 ... was not achieved" — that conclusion was written from local-only measurement and is more conservative than the full evidence (including CI, captured later at the same HEAD) supports. This is a finding for the phase's own record, not a gap in what actually shipped. |
| 4 | No applied fix changes user-facing behavior without that change appearing in EASY-FIXES.md | ⏭ DEFERRED to Phase 68 | Confirmed `.planning/reviews/EASY-FIXES.md` does not exist (`test ! -f` succeeds). This is explicitly Phase 68's DOC-01 deliverable per ROADMAP.md's own Phase 68 goal text. All 77 ledger rows carry the exact fields DOC-01 needs (`finding_id`, `location`, `dimension`, `failure_scenario`, `fix_applied`, `commit`, `user_facing`) with zero empty fields (I scanned for `TBD`/empty and found none live in the ledger data — the one remaining `TBD` string match is prose describing a since-fixed gap, not a live field). 29 rows are flagged `user_facing: yes`. See `deferred:` in frontmatter. |

**Score:** 3/4 roadmap Success Criteria directly verified; 1 legitimately deferred to Phase 68 by the milestone's own phase boundary (not a gap).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `67-APPLY-SET.md` | 77-row derived ledger, one per easy-fix COVERAGE record | ✓ VERIFIED | Re-derived independently with `node derive-apply-set.mjs` — 77 rows, matching. Verdict distribution 70 applied / 4 no-op / 1 deferred / 2 excluded = 77 (counted directly via grep, matches the close-out's own claimed distribution). |
| `67-BASELINE.md` | Phase-start + phase-close test/lint/build measurement, named failing tests, D-08 flaky-exclusion reasoning | ✓ VERIFIED | Read in full; phase-start and phase-close sections both present, both name the same 11 deterministic interop test names, both document `./gradlew build`'s JDK version-check failure and lint's clean exit. Independently reproduced the phase-close `npm test`/`npm run lint` results myself (see Truth 3). |
| `derive-apply-set.mjs` | Mechanical derivation script, no hand-entered rows | ✓ VERIFIED | Ran it myself; reproduces 77 rows from the six COVERAGE files' `disposition:` field, no other input. |
| `67-REVIEW.md` | Code review of the phase's own diff | ✓ VERIFIED (present, substantive) | 365 lines, 33 files reviewed, 1 Critical / 6 Warning / 4 Info findings, each with file:line, mechanism, and fix suggestion. Independently spot-checked two of the warnings (WR-04's lexer split regex, WR-02's newly-added `onClose`/`onError` listeners) directly against the current source — both confirmed accurate and both confirmed introduced by this phase's own commits. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `67-APPLY-SET.md` rows | `.planning/reviews/{61..66}-COVERAGE.md` | `disposition:` field selection | ✓ WIRED | `derive-apply-set.mjs` reads only these six files; re-running it reproduces the identical 77 rows. |
| `67-APPLY-SET.md` `commit:` fields | git history | commit sha resolution | ✓ WIRED | 98 unique shas claimed resolvable; I spot-checked 3 (`382a068`, `32faeff`, `97a2e6b`) via `git cat-file -e`, all resolve; ledger's own audit claims zero failures across all 98 (not independently re-verified exhaustively, but the mechanism — `git cat-file -e` — is sound and the sample checks agree). |
| Draft PR #496 head | Full phase commit range | CI status checks | ✓ WIRED | Independently queried via `gh pr view 496` — head `7998106` matches local `HEAD` exactly (`git log --oneline -1`), all 4 checks SUCCESS, confirming CI evaluated the phase's complete final state including the code-review-report commit. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Lint is genuinely clean | `cd bbj-vscode && npm run lint` | exit 0, zero warnings | ✓ PASS |
| Local `npm test` failure set matches documented baseline | `cd bbj-vscode && npm test` (run 3×) | 11 failed tests every run, always the same `linking.test.ts` Interop names; 2 of 3 runs showed additional `beforeAll` hook-timeout flakes on unrelated suites (documented, load-dependent) | ✓ PASS (matches 67-BASELINE.md's close-out exactly) |
| CI test suite passes on the phase's final commit | `gh run view 32268700467/32272441035 --log` (BBj CI job) | `Tests 966 passed \| 26 skipped (992)`, 0 failed | ✓ PASS |
| IntelliJ plugin builds on a real JDK 17 in CI | `gh pr view 496` → `validate-intellij` check | SUCCESS, runs `./gradlew buildPlugin` | ✓ PASS |
| Ledger re-derivation is reproducible | `node derive-apply-set.mjs` | 77 rows | ✓ PASS |
| No debt markers in phase-touched source files | `grep -nE "TBD\|FIXME\|XXX"` over every file in `git diff --name-only 47bb785..HEAD -- bbj-vscode/src bbj-intellij/src .github/workflows CLAUDE.md bbj-vscode/test` | zero matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FIX-01 | All 12 plans | Atomic, finding-ID-traceable commits | ✓ SATISFIED | See Truth 1 |
| FIX-02 | All 12 plans | Regression test for behavior-changing fixes | ✓ SATISFIED | See Truth 2 |
| FIX-03 | All 12 plans | Green test/lint/build suite | ✓ SATISFIED (via CI; local sandbox quirk noted) | See Truth 3 |
| FIX-04 | 67-06, 67-11, 67-12 | User-facing changes recorded in EASY-FIXES.md | ⏭ DEFERRED (Phase 68's explicit deliverable) | See Truth 4 |

No orphaned requirements — `REQUIREMENTS.md`'s Phase-67 rows (lines 147-150) are exactly FIX-01..04, all four appear in at least one plan's `requirements:` frontmatter. `REQUIREMENTS.md` itself deliberately leaves all four as `Pending`/unchecked — this is the phase's own documented D-07 decision (the ledger and baseline carry the true discharge state, not the checklist), not an oversight; I verified `REQUIREMENTS.md` lines 66-69 and 147-150 directly and confirmed they are unedited, matching the phase's own claim.

### Anti-Patterns Found

None. Scanned every file `git diff --name-only 47bb785..HEAD` touched under `bbj-vscode/src`, `bbj-intellij/src`, `.github/workflows`, `CLAUDE.md`, `bbj-vscode/test` for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/stub-return patterns — zero debt markers. The few `placeholder`-string matches found (`extension.ts` quickpick UI text, a `cpl-service.ts` code comment about a temporary process-handle variable) are legitimate, non-stub usages. One pre-existing "not yet implemented" comment (`BbjCompileAction.java`) was *added* by this phase's own `P63-D8-002` doc-accuracy fix to honestly document a known, already-filed limitation (`P63-D7-001`) — not a new stub.

### Code Review Findings (67-REVIEW.md, commit `7998106`)

Not a SUMMARY.md claim — an artifact I read directly and partially independently reproduced.

- **1 Critical (CR-01):** pre-existing, unvalidated `bbj.home` → `spawn()` exposure. Correctly not fixed by this phase (it is `P61-D1-003`, a `major-refactor`/D1 finding — Phase 67's own D-05 rule forbids re-triaging classification, and D1 findings are categorically routed away from this phase per INVENTORY §3c test 6). Phase 67's `500001d` commit adds a *characterization* test pinning current behavior rather than fixing it, which is consistent with the finding's own routing. Correctly flagged for Phase 68/69 to prioritize.
- **6 Warnings**, all in code this phase introduced or modified (confirmed for 2 of the 6 directly against current source): narrow-trigger concurrency/timing issues in `java-interop.ts`'s new LRU cache and connection-lifecycle listeners, a shared-mutable cancellation token in `bbj-completion-provider.ts`, a lexer split regex change that silently widens beyond its stated CRLF/LF scope, a stale-content race in the new shared in-flight format promise, and an mtime-granularity assumption in the `.lst` freshness gate. None of these are covered by the regression tests the phase itself added for these fixes (the review explicitly notes each test's blind spot). These bear directly on the phase goal's "low-risk" framing and are the primary reason this report routes to human verification rather than a clean pass.
- **4 Info-level** items — minor, non-behavior-affecting code-quality nits.

## Gaps Summary

No gaps in the ROADMAP contract's literal sense — no truth is FAILED, no artifact is missing or stub, no key link is broken, and no unresolved debt marker exists in phase-touched code. Success Criterion 4 (EASY-FIXES.md) is legitimately deferred to Phase 68 by the milestone's own explicit phase boundary, not silently dropped — the ledger carries everything Phase 68 needs to assemble it.

The one substantive open question is a judgment call, not a fact deficit: whether the 6 findings in the phase's own code review — 5-6 of them newly introduced by this phase's "easy fix" commits, none exercised by the regression tests those same commits added — are compatible with the phase goal's explicit "low-risk" framing, or whether they warrant a fast-follow fix or filed issue before Phase 67 is considered fully closed. That is why this report's status is `human_needed` rather than `passed`.

## Human Verification Required

See `human_verification:` in frontmatter — two items: (1) accept-or-require-follow-up on the 6 code-review findings' residual risk against the phase's own "low-risk" goal wording, and (2) confirm CR-01's pre-existing/out-of-scope routing to Phase 68 is correct.

---

_Verified: 2026-08-19T15:56:41Z_
_Verifier: Claude (gsd-verifier)_
