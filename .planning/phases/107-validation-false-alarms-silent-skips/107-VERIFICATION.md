---
phase: 107-validation-false-alarms-silent-skips
verified: 2026-09-25T02:01:03Z
status: human_needed
score: 6/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Approve or reject the comparable-A2 reading for ROADMAP criterion 3's numeric gate (A2 ≤ 22)"
    expected: "One of two readings is accepted as satisfying criterion 3's A2 clause: (a) the file-set reading — comparable A2 measures 25 on this phase's own same-corpus base, but every one of those 25 files was already present in the base (33); the count fell by 8 and zero new files entered comparable A2, so the phase caused no regression and made a net improvement; or (b) the raw-number reading — the historical ≤22 exit gate (measured on a corpus roughly 3-4x smaller) is held as the letter of the criterion, and the 3 residual files above it (2 line-break-family, 1 DECLARE-placement, all pre-existing and unrelated to this phase's three fixes) are carried forward as residue, matching the precedent set at the Phase 98 close (98-VERIFICATION.md's own override)."
    why_human: "This is a judgment call about which of two legitimate readings of a numeric roadmap gate governs, when the corpus itself grew between the historical measurement and this one; 107-06 and 107-CONFORMANCE.md §4 both explicitly declined to resolve it either way and routed it to a human check, following the same precedent already used at the Phase 98 close. No grep or test can adjudicate which reading the roadmap author intended."
---

# Phase 107: Validation False Alarms & Silent Skips Verification Report

**Phase Goal:** Valid single-line `IF` code no longer draws line-break errors the compiler would
never report, and the use-before-assignment check no longer gives up on a file without a trace.
Plus VAL-03: an unknown member on a fully resolved Java class is one Error.
**Verified:** 2026-09-25T02:01:03Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | Single-line IF/ELSE/end-of-IF shapes the compiler accepts, including the nested one-liner `if a then if b then c=1 else d=1 fi else e=1 fi`, show no "This statement needs to start in a new line" error | VERIFIED | `elseStatementLineBreaks` in `line-break-validation.ts:198-224` implements the `openIfs`/`elseClaims` two-counter repair exactly as the SUMMARY describes; `npx vitest run test/line-break-single-line-if.test.ts` passes (re-run live: 4 files / 129 tests, 0 failed) including the nested one-liner case and the D-02 matrix (deeper nesting, ELSE-only nesting, semicolon-chained, labelled, colon-continued forms) |
| 2 | A genuinely misplaced ELSE or FI with no open IF left on its line is still reported, and existing "still flagged" regression cases stay flagged | VERIFIED | `ifEndStatementLineBreaks` byte-identical to base (diff confirmed empty per 107-01's own acceptance gate); `line-break-walk-termination.test.ts` ("a second ELSE for one IF is still flagged" and siblings) and the new "an extra ELSE after a complete nested IF/ELSE/FI group is still flagged" case both pass in the live re-run |
| 3a | The valid files re-flagged at the Phase 98 close no longer carry the line-break error | VERIFIED | 107-CONFORMANCE.md §4 "VAL-01 target set": per-file probe on all 7 target files against the final tree — 0 of 7 carry any `bbj-line-break` Error |
| 3b | A2 is at or below its v4.5 exit count of 22 | UNCERTAIN — see Human Verification | Measured comparable A2 = 25 (base of this same-corpus phase = 33, zero new files entered, 8 fewer than base) vs. the historical ≤22 number measured on a ~3-4x smaller corpus checkout. 107-06 and 107-CONFORMANCE.md §4 explicitly route this to a human check rather than resolve it either way |
| 3c | No file newly enters B, compared by file set rather than totals | VERIFIED | 107-CONFORMANCE.md §4 "File-set comparison: B" — reconciled `missedReconciled` (the endpoint-verdict measure the criterion's own gate reads) shows 0 newly entered files. (2 raw-`missed` newcomers are noted transparently as pre-existing rejected code that a since-removed false alarm coincidentally used to mask — not a new regression on the criterion's own reconciled measure) |
| 4 | A file containing `## = 1` gets no "An error occurred during validation" diagnostic, and a use-before-assignment hint elsewhere in the same file still appears | VERIFIED | All 8 `.symbol` reads in `check-variable-scoping.ts` guarded with `symbol?.` (grep confirms all 8); `bbj-scope-local.ts:293` guards `isSymbolRef(node) && node.symbol`; `npx vitest run test/variable-scoping.test.ts` passes live (49/49 including the `## = 1`, `ENTER ##`, and five-shape `test.each` regressions) |
| 5 | `BBjAPI().anyInvalidMethod()` and the same unknown member on any other fully resolved Java class show one Error on the member name, also with other file errors; unresolved/cold/synthetic/BBj-class/template-string receivers keep the Warning; a local conformance run shows no new Error on a member that exists | VERIFIED | `check-unknown-java-member.ts` (257 lines) exports all five required symbols; registered in `bbj-validator.ts:76`; `dropShadowedMemberLinkingDiagnostics` wired into `validateDocument` (`bbj-document-validator.ts:304`); `npx vitest run test/unknown-java-member.test.ts` passes live (34 tests); live-backend functional suite reported 5/5 passed against `:5008` (SUMMARY, re-confirmed commits exist); 107-05's full-corpus live review (16,884 files) found and guarded 5 false-positive shapes, leaving 0 unclassified/regression findings in 107-06's final classification |

**Score:** 6/7 truths verified (1 routed to human judgment; 0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `bbj-vscode/src/language/validations/line-break-validation.ts` | `elseClaims` counter, unchanged `ifEndStatementLineBreaks`, `previousStatement` DefReturn skip | VERIFIED | Confirmed by direct read: `elseClaims` present (line 200), DefReturn-skip loop present (lines 289-292) with the documented rationale comment |
| `bbj-vscode/test/line-break-single-line-if.test.ts` | Regression matrix | VERIFIED | Passes live; includes nested one-liner, extra-ELSE, colon-continued, DEF-FN/RETURN-chain cases |
| `bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj` | New clean fixture shapes | VERIFIED | Auto-parsed by `example-files.test.ts`, which passes |
| `bbj-vscode/src/language/validations/check-variable-scoping.ts` | 8 guarded `symbol?.` reads | VERIFIED | `grep -c "symbol?.\$refText"` = 8 |
| `bbj-vscode/src/language/bbj-scope-local.ts` | `isSymbolRef(node) && node.symbol` guard | VERIFIED | Present at line 293; ⚠️ see WR-03 below for a same-shape unguarded read elsewhere in the file (advisory, not proven reachable) |
| `bbj-vscode/test/variable-scoping.test.ts` | Malformed-reference regression tests | VERIFIED | Passes live (49/49) |
| `bbj-vscode/src/language/validations/check-unknown-java-member.ts` | New check module, 5 exports | VERIFIED | All 5 exports present; 257 lines, not a stub |
| `bbj-vscode/src/language/bbj-document-validator.ts` | `dropShadowedMemberLinkingDiagnostics` | VERIFIED | Exported and called in `validateDocument` |
| `bbj-vscode/src/language/bbj-validator.ts` | Registration call | VERIFIED | `registerUnknownJavaMemberChecks(registry, services)` present |
| `bbj-vscode/test/unknown-java-member.test.ts` | Guard-case/certainty/hierarchy/dedup tests | VERIFIED | Passes live (34 tests) |
| `bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts` | Live BBjAPI() cases | VERIFIED | Present, gated on `shouldRunBBjTests()`; SUMMARY reports 5/5 passed not skipped on this machine (not independently re-run here per the effort budget — file existence, gating and commit history confirmed) |
| `.planning/phases/107-validation-false-alarms-silent-skips/107-CONFORMANCE.md` | Before/after harness measurement | VERIFIED | Present, four sections (baseline, target set, re-measure, final measurement), matches the orchestrator's stated facts exactly |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `lineBreakMap` in `line-break-validation.ts` | `elseStatementLineBreaks` mask | mask.both decided per ElseStatement | WIRED | Confirmed in `lineBreakMap` array (line 44) |
| `conformance-regressions.test.ts` | `single-line-if-forms.bbj` | folder scan, zero Error diagnostics | WIRED | Test passes (per 107-01/107-04 SUMMARY, and this phase's own `example-files.test.ts`/`conformance-regressions.test.ts` runs recorded in 107-CONFORMANCE.md) |
| `registerVariableScopingChecks` | `checkUseBeforeAssignment` | symbol-less SymbolRef no longer throws | WIRED | `variable-scoping.test.ts` passes live |
| `BbjScopeComputation.collectLocalSymbols` | `processNode` input-variable branch | `isSymbolRef(node) && node.symbol` guard | WIRED | Confirmed at `bbj-scope-local.ts:293` |
| `registerValidationChecks` in `bbj-validator.ts` | `registerUnknownJavaMemberChecks` | called after `registerFunctionCallChecks(registry)` | WIRED | Confirmed at line 76 |
| `BBjDocumentValidator.validateDocument` | `dropShadowedMemberLinkingDiagnostics` | applied to `super.validateDocument`'s result before remembering | WIRED | Confirmed at line 304 |
| `checkUnknownJavaMember` | `services.types.Inferer.getType(receiver)` | receiver type read, then `isFullyResolvedJavaClass` | WIRED | Confirmed by reading `check-unknown-java-member.ts` |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Nested one-liner / D-02 matrix / "still flagged" regressions | `cd bbj-vscode && npx vitest run test/line-break-single-line-if.test.ts test/line-break-walk-termination.test.ts` | 2 files, part of 4-file run below | ✓ PASS |
| Malformed-reference silent skip (`## = 1`, `ENTER ##`, five-shape matrix) | `cd bbj-vscode && npx vitest run test/variable-scoping.test.ts` | part of 4-file run below | ✓ PASS |
| Unknown-Java-member Error + guard cases | `cd bbj-vscode && npx vitest run test/unknown-java-member.test.ts` | part of 4-file run below | ✓ PASS |
| All four files together | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/line-break-single-line-if.test.ts test/line-break-walk-termination.test.ts test/variable-scoping.test.ts test/unknown-java-member.test.ts` | `Test Files 4 passed (4)`, `Tests 129 passed (129)` | ✓ PASS |
| Live-backend BBjAPI() unknown-member test | not independently re-run (requires `:5008` warm-up sequence and `RUN_BBJ_TESTS=1`; SUMMARY + commit history already give strong evidence) | n/a | ? SKIP |
| Whole-suite gate | already run and reported by the orchestrator at commit `674e4096` (build OK, 2728 tests, only the 11 known `linking.test.ts` interop-drift failures) — not re-run here to respect the "run the full suite at most once" constraint | n/a | ✓ PASS (orchestrator-provided) |

### Probe Execution

No `scripts/*/tests/probe-*.sh`-convention probes exist in this repository, and none were declared by this phase's plans/summaries. Step 7c: SKIPPED (no runnable entry points of that convention). The phase's actual "probe" — the private conformance harness — runs outside this repository against a private corpus per D-13 and is documented in `107-CONFORMANCE.md`, which is treated as the evidentiary record for Success Criteria 3 and 5's corpus clauses (see Observable Truths above).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| VAL-01 | 107-01, 107-04, 107-06 | Single-line IF/ELSE/FI false alarms fixed, still-flagged cases stay flagged | ✓ SATISFIED | REQUIREMENTS.md marks Complete; truths 1, 2, 3a, 3c verified above |
| VAL-02 | 107-02, 107-06 | Use-before-assignment / scope computation no longer crash on symbol-less reference | ✓ SATISFIED | REQUIREMENTS.md marks Complete; truth 4 verified above |
| VAL-03 | 107-03, 107-05, 107-06 | Unknown Java member on fully resolved class reported as Error | ? NEEDS HUMAN | REQUIREMENTS.md marks Pending — explicitly left open by 107-06 because the shared A2 numeric gate (truth 3b, which VAL-03's own harness noise is entangled with) needs a human call. The check itself is fully implemented, tested, and reviewed against the live corpus (truth 5 above is otherwise VERIFIED) |

No orphaned requirements: ROADMAP.md's "Requirements: VAL-01, VAL-02, VAL-03" for Phase 107 matches REQUIREMENTS.md's phase mapping table exactly (3 of 3, "19/19 mapped" per REQUIREMENTS.md's own footer).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `bbj-vscode/src/language/bbj-scope-local.ts` | 275 | Pre-existing `TODO` (predates this phase, `git log -S` traces it to commit `8c31de56`, unrelated to Phase 107's diff) | ℹ️ Info | Not introduced by this phase; not a debt-marker gate hit for this phase's own diff |

No `TBD`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER` markers, no empty stub implementations, and no hardcoded-empty-data patterns found in any file this phase modified (`line-break-validation.ts`, `check-variable-scoping.ts`, `bbj-scope-local.ts`, `check-unknown-java-member.ts`, `bbj-validator.ts`, `bbj-document-validator.ts`).

**Code review findings (107-REVIEW.md, advisory — 0 critical, 3 warnings, 2 info):** All five findings describe the check being *more conservative than necessary* (additional false negatives), never a false positive or a crash — consistent with D-11's explicit design bias ("flag only what is certain"). None invalidates a must-have truth:
- **WR-01** (nested-Java-type bare-reference gap) and **WR-02** (BBjAPI text-match instead of resolved-symbol check) are narrow, unproven-reachable false-negative gaps in the new check.
- **WR-03** (an unguarded `symbol.$refText` remains in `bbj-scope-local.ts`'s `isAssignment` branch, one function away from the guard this phase added to the `isInputVariable` branch) — confirmed present at the code location the review names (line 240-241 above). The reviewer's own investigation (14 malformed-LHS shapes tried) could not reach this line with `symbol` undefined; it is a real but currently-unproven crash path, not a demonstrated regression of VAL-02's specific `## = 1`/`ENTER ##` repro cases, which this verification confirms are fixed. **Recommend as a WARNING-level follow-up, not a phase blocker.**
- **IN-01, IN-02** are false-negative-only scoping/literal edge cases in the new check, explicitly info-level per the reviewer.

### Human Verification Required

### 1. Comparable-A2 numeric gate (ROADMAP criterion 3, clause "A2 ≤ 22")

**Test:** Read `.planning/phases/107-validation-false-alarms-silent-skips/107-CONFORMANCE.md` §4's
"Verdicts" section and decide which reading governs: (a) the file-set reading — zero new files
entered comparable A2, count fell 33→25, net improvement; or (b) the raw-number reading — hold to
the historical ≤22 gate and carry the 3 residual pre-existing files forward as documented residue
(matching the Phase 98 close's own precedent).
**Expected:** A decision recorded (e.g. an `overrides:` entry accepting the file-set reading, or an
explicit decision to hold the requirement Pending until the residual files are separately addressed).
**Why human:** The corpus itself grew ~3-4x between the historical exit measurement and this one,
making the raw counts not directly comparable; 107-06 explicitly declined to resolve this
automatically and routed it to a human check, exactly as instructed by the orchestrator facts for
this verification run.

### Gaps Summary

No gaps found. All three requirements (VAL-01, VAL-02, VAL-03) have working, tested, wired
implementations; the whole-suite gate is green apart from the pre-existing, unrelated 11-failure
interop-backend-drift baseline; every artifact and key link is present and wired; no debt markers,
stubs, or blocker-level anti-patterns were introduced. The phase is held at `human_needed` rather
than `passed` solely because one numeric roadmap gate (comparable A2 vs. the historical ≤22 exit
count) has two legitimate readings and the phase's own authors (107-06, 107-CONFORMANCE.md)
explicitly deferred that single judgment call to a human rather than resolving it either way —
which is exactly why REQUIREMENTS.md correctly still shows VAL-03 as Pending rather than Complete.

---

*Verified: 2026-09-25T02:01:03Z*
*Verifier: Claude (gsd-verifier)*
