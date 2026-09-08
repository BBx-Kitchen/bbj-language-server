---
phase: 88-setopts-in-code-hovers-tri-state-composer
plan: 07
subsystem: language-server
tags: [setopts, hover, chain-analysis, static-safety, gap-closure]
requires:
  - 88-02 (traceOptsChain, matchStatement, SetOptsUnsafeReason)
  - 88-03 (createDecodeInCodeHandler edit-gating on traceOptsChain's safe/unsafe verdict)
provides:
  - "SetOptsUnsafeReason 'indexed-target' plus its UNSAFE_REASON_TEXT sentence"
  - indexedAccessRootName accessor-unwrapping helper in setopts-code-scanner.ts
affects:
  - bbj-vscode/src/language/setopts-code-scanner.ts
  - bbj-vscode/src/language/setopts-in-code-request.ts (behavior only, no file edit — reads UNSAFE_REASON_TEXT)
actuals:
  tokens: 3645
  tasks: 2
  commits: 4
tech-stack:
  added: []
  patterns:
    - "Accessor-unwrapping helper (indexedAccessRootName) strictly complementary to symbolRefName: one returns a name only for a bare SymbolRef, the other only after unwrapping at least one MethodCall/ArrayElement/MemberCall layer, so no call site can double-match the same expression"
key-files:
  created: []
  modified:
    - bbj-vscode/src/language/setopts-code-scanner.ts
    - bbj-vscode/test/setopts-code-scanner.test.ts
    - bbj-vscode/test/setopts-in-code-request.test.ts
key-decisions:
  - "Explicit unsafe reason chosen over tracking the indexed mutation as a real chain link — SetOptsChainLink/foldChainEffect carry no byte offset, so folding a byte-range mask as a whole-vector link would silently decode to the wrong option; a named 'cannot determine' is strictly safer than a wrong answer, and restores D-04's edit-gate boundary for a shape the scanner cannot represent"
patterns-established:
  - "Two independent matchStatement classification sites (assignment-target LHS, IOR/AND call's own first argument) both route through the same indexedAccessRootName helper, and walkChain's verdict switch has no default arm, so a future third site or a new verdict kind fails to compile until explicitly handled"
requirements-completed: [DISC-05, DISC-06]
coverage:
  - id: byte-range-target-unsafe
    description: "A byte-range/element write to the SETOPTS-tracked variable's own accessor (A$(1,1)=, A$[1]=, any value) is classified 'indexed-target', not silently skipped as irrelevant"
    requirement: DISC-06
    verification:
      - kind: automated
        ref: "bbj-vscode/test/setopts-code-scanner.test.ts (5 new cases in the chain-walk describe block)"
        status: pass
    human_judgment: false
  - id: byte-range-argument-unsafe
    description: "A whole-variable IOR/AND reassignment whose first argument is itself a byte-range accessor of the tracked variable (A$=IOR(A$(1,1),...)) is classified 'indexed-target', not 'alias'"
    requirement: DISC-06
    verification:
      - kind: automated
        ref: "bbj-vscode/test/setopts-code-scanner.test.ts (whole-variable target with byte-range IOR argument case)"
        status: pass
    human_judgment: false
  - id: hover-names-reason
    description: "The chain hover for a byte-range chain states the value cannot be determined statically and names the byte-range reason, never the safe-chain Sets/Clears framing"
    requirement: DISC-05
    verification:
      - kind: automated
        ref: "bbj-vscode/test/setopts-code-scanner.test.ts (setoptsHoverMarkdown describe block, indexed-target markdown case)"
        status: pass
    human_judgment: false
  - id: edit-gate-closed
    description: "decodeInCode reports editable:false with a non-empty reason and no chain/initial payload for a byte-range chain, so no client can rewrite the user's one-byte statements as a full-width assignment"
    requirement: DISC-06
    verification:
      - kind: automated
        ref: "bbj-vscode/test/setopts-in-code-request.test.ts (indexed-target reproduction case)"
        status: pass
    human_judgment: false
  - id: transparency-guard
    description: "A byte-range mutation of an unrelated variable is still transparent to the walk, and genuine aliasing still reports 'alias' -- no new false-unsafe verdicts"
    requirement: DISC-06
    verification:
      - kind: automated
        ref: "bbj-vscode/test/setopts-code-scanner.test.ts (two GUARD cases)"
        status: pass
    human_judgment: false
  - id: coverage-hole-closed
    description: "The reason-coverage test now fails if a SetOptsUnsafeReason member is added without a UNSAFE_REASON_TEXT sentence and a covering test case"
    requirement: DISC-06
    verification:
      - kind: automated
        ref: "bbj-vscode/test/setopts-code-scanner.test.ts (cases.length === Object.keys(UNSAFE_REASON_TEXT).length assertion)"
        status: pass
    human_judgment: false
  - id: live-hover-retest
    description: "G-88-1's user-visible 'no hover at all' / 'chain does not decode' symptom is confirmed fixed in a rebuilt, reinstalled VS Code and IntelliJ"
    requirement: DISC-05
    verification: []
    human_judgment: true
    rationale: "Explicitly out of scope for this plan (code-only fix). Requires a human to rebuild + reinstall both IDE integrations and re-run 88-UAT.md Test 1's hover checks live. G-88-1 stays status:failed until that happens -- see Next Phase Readiness below."
duration: 20min
completed: 2026-09-08
status: complete
---

# Phase 88 Plan 07: Byte-Range Accessor OPTS Chain Classification Summary

`matchStatement` now returns a named `indexed-target` unsafe reason -- instead of silently
treating the statement as irrelevant -- whenever a `SETOPTS`-tracked variable is mutated through
BBj's idiomatic byte-range/element accessor (`A$(1,1)=`, `A$[1]=`, or as an `IOR`/`AND` call's own
first argument), closing the false-`safe:true`/empty-effect defect at the root of G-88-1's code
half.

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-08T13:04Z (approx, continuing from prior plan's STATE.md timestamp)
- **Completed:** 2026-09-08T13:24Z
- **Tasks:** 2/2
- **Files:** 3 (1 production, 2 test)

## Accomplishments

- Added `SetOptsUnsafeReason`'s sixth member, `'indexed-target'`, with its `UNSAFE_REASON_TEXT`
  sentence: "one of the reassignments reads or writes a byte range or element of the variable,
  such as A$(1,1), rather than the whole variable"
- Added `indexedAccessRootName`, a module-private helper that unwraps `MethodCall`/`ArrayElement`/
  `MemberCall` postfix accessor layers back to their root `SymbolRef`, bounded by a defensive
  `MAX_ACCESSOR_HOPS` ceiling and strictly complementary to the existing `symbolRefName` (never
  double-matches the same expression)
- Wired both classification sites in `matchStatement`: the per-assignment loop's LHS check (fires
  regardless of the assignment's own value) and the IOR/AND call's first-argument check (fires
  before the existing `alias` fallback)
- Added the matching arm to `walkChain`'s verdict switch with no `default:` case, preserving the
  compiler-enforced exhaustiveness that would have caught this defect originally
- Closed the reason-coverage test's hole: its case array length is now tied to
  `UNSAFE_REASON_TEXT`'s key count, so a future unnamed reason fails the test until it gets both a
  sentence and a case
- 9 new executing tests across both test files (3 from Task 1, 6 from Task 2, including two
  explicit transparency/aliasing guards); targeted suite count grew from the plan's measured
  baseline of 172 to 181, 0 failed

## Task Commits

1. `test(88-07): add failing tests for byte-range accessor OPTS mutations` — 8424f901c7223203d99fa8fe0df32b11d9278658
2. `feat(88-07): classify byte-range accessor assignment targets as unsafe` — a44df25b85e9c3fd0cbd6780da1e7a12b0e2eef3
3. `test(88-07): add failing test for byte-range IOR/AND argument site` — 2fcabc6045c4d0c41b2122fcd6e764ee23a7ae1d
4. `feat(88-07): classify byte-range IOR/AND arguments as unsafe, not alias` — f88b958d586bbc53b0e973fdb500178cac82416c

## Files Created/Modified

- `bbj-vscode/src/language/setopts-code-scanner.ts` — new `SetOptsUnsafeReason` member, its
  sentence, the `indexedAccessRootName` helper, the two `matchStatement` classification sites, and
  `walkChain`'s new switch arm
- `bbj-vscode/test/setopts-code-scanner.test.ts` — 8 new executing tests (both reported
  reproductions, the bracket `ArrayElement` form, a non-IOR/AND byte-range write, the whole-variable
  target with a byte-range IOR argument, two transparency/aliasing guards) plus the coverage-hole
  fix
- `bbj-vscode/test/setopts-in-code-request.test.ts` — 1 new test proving `decodeInCode` returns
  `editable: false` with a non-empty reason and no `chain`/`initial` payload for the reported
  byte-range reproduction

## Decisions Made

- **Explicit unsafe reason, not tracked indexed mutation** (per the plan's own pre-made
  direction, executed as specified): `SetOptsChainLink`/`foldChainEffect` carry no byte offset, so
  a mask written at `A$(2,1)` would fold as a byte-1 mask and decode to the wrong option if treated
  as a real chain link. A named "cannot determine" is strictly safer than a silently wrong decode,
  and restores D-04's "hover decode only, no edit action" boundary for a shape the scanner cannot
  represent.

## Deviations from Plan

None — plan executed exactly as written. Both classification sites, the helper, the sentence, the
switch arm, and all nine tests (three from Task 1's behavior block, six from Task 2's) match the
plan's `<action>`/`<behavior>` text. The tracer feedback gate (re-running Task 1's `<verify>`
before starting Task 2) passed on the first run with no fixes needed.

**Total deviations:** 0. **Impact:** none.

## Before/After `traceOptsChain` Verdicts (both reported reproductions)

| Reproduction | Before | After |
|---|---|---|
| `a$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$` | `{ safe: true, links: [], effect: { set: [], clear: [] } }` | `{ safe: false, unsafeReason: 'indexed-target', links: [] }` |
| `LET A$=OPTS` / `LET A$(2,1)=AND(A$(2,1),$7F$)` / `SETOPTS A$` | `{ safe: true, links: [], effect: { set: [], clear: [] } }` | `{ safe: false, unsafeReason: 'indexed-target', links: [] }` |

Both now render hover markdown stating the value cannot be determined statically and naming the
byte-range reason, and `decodeInCode` at each line's `SETOPTS A$` now returns
`found: true, editable: false, mode: 'chain'` with a non-empty `reason` and no `chain`/`initial`
field — the edit-in-place gate is closed for both shapes.

## Whole-Suite Regression Sweep

`npx vitest run --maxWorkers=2` (from `bbj-vscode/`): **1459 passed, 12 failed, 5 skipped** of 1476
total. `numFailedTests: 12` matches the plan's documented known baseline exactly (11 in
`linking.test.ts`'s Interop-related tests, 1 in `issue447-real-interop.test.ts`'s capability
detection test — both caused by the live java-interop service on :5008 having grown
`getAllClassNames` since those fixtures were written; pre-existing environment drift, unrelated to
this change and out of this plan's scope per its own deviation rules). No regression beyond the
known baseline; no failure inside any suite this plan touches.

Note: an initial whole-suite run invoked with the executor's shell cwd at the repo root (rather
than `bbj-vscode/`) surfaced 4 additional failures in `language-configuration.test.ts` and 2
skipped-suite failures in the textmate highlighting tests — these use bare relative `readFileSync`
paths (`'package.json'`, `'bbj-language-configuration.json'`, `'node_modules/vscode-oniguruma/...'`)
that only resolve correctly when `process.cwd()` is `bbj-vscode/`. `npm --prefix <dir> exec --`
does **not** change `process.cwd()` for the invoked command (confirmed empirically). Re-running
with cwd set to `bbj-vscode/` made all four pass immediately, confirming this was purely an
invocation artifact of the executor's shell, not a real regression — recorded here so a future
whole-suite run from a non-`bbj-vscode` cwd isn't mistaken for a new gap.

## Verification (plan's 5-step section)

1. **Build** (`npm --prefix bbj-vscode run build`): typecheck + esbuild bundle, clean, no errors.
2. **Lint** (`npm --prefix bbj-vscode run lint`): clean, no warnings on touched files.
3. **Targeted suites**: 5 files passed, 181 tests passed, 0 failed (baseline was 172; grew by the
   9 new tests, all passing).
4. **Whole-suite sweep**: `numFailedTests: 12`, matching the known baseline exactly (see above).
5. **Source-comment register check**: `git diff` over the touched files' added (`+`) lines,
   grepped for plan numbers (`88-0N`), decision ids (`D-NN`), review-finding ids (`WR-NN`,
   `CR-NN`), gap ids (`G-88-N`), threat ids (`T-88-N`), and requirement ids (`DISC-0N`) — zero
   matches. No planning identifiers leaked into new source or test comments.

## Issues Encountered

None. Implementation matched the plan's pre-verified `interface_context` facts exactly — the
`MethodCall`/`ArrayElement`/`MemberCall` grammar shapes and their `method`/`receiver` field names
were correct on first use, and no fix-attempt cycles were needed on either task.

## User Setup Required

None for this plan's code changes. See "Next Phase Readiness" below for the separate,
already-known extension rebuild/reinstall step this plan does not perform.

## Next Phase Readiness

**G-88-1 is only PARTIALLY closed by this plan — it is NOT a full gap closure, and this
SUMMARY.md must not be read as closing it.**

This plan fixed exactly the code defect: `matchStatement()` misclassifying byte-range/element
accessors as transparent to the OPTS chain walk. That fix is verified above by 9 executing tests,
the whole-suite sweep, and the source-comment register check — all green.

**What this plan did NOT fix, and cannot fix with code:** G-88-1's diagnosis in
`.planning/debug/g-88-1-hover-no-decode.md` records a second, independent root cause — the VS Code
extension installed during the original UAT round predates every Phase 88 hover commit and
contains none of this feature's code at all. Landing this fix changes nothing a user can observe
until:

1. Both IDE integrations are rebuilt and reinstalled: `npm --prefix bbj-vscode run build` then
   `bbj-ext-install` (VS Code), and `./gradlew buildPlugin` from `bbj-intellij/` (IntelliJ).
2. `88-UAT.md` Test 1's hover checks are re-run LIVE in both rebuilt IDEs, on the user's exact
   reported code block.

This plan's frontmatter deliberately carries `gap_ids: []` (empty) rather than `[G-88-1]`, so
`/gsd-verify-work`'s `reconcile_gaps` step cannot auto-mark G-88-1 `resolved` on account of this
SUMMARY.md existing on disk. **G-88-1 stays `status: failed` until a human completes the live
retest above.** If a later `--gaps` round re-diagnoses G-88-1, the code half is already closed
here — a new plan is warranted only if the live retest still fails on a verified-fresh install.

DISC-05 and DISC-06 are marked complete by this plan (see `requirements-completed` above) since
both requirements' static-analysis and edit-gating deliverables are now code-complete and covered
by executing tests; this is independent of G-88-1's live-hover human-verification gap, which
tracks the separate packaging/installation issue.
