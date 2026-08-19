---
phase: 66-known-debt-re-triage
verified: 2026-08-19T00:00:00Z
status: passed
score: 15/15 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 66: Known Debt Re-triage Verification Report

**Phase Goal:** Every debt item carried forward from prior milestones is re-triaged against current
code — resolved now, or converted into a properly filed issue with a concrete plan — so no debt
survives this milestone as bare prose in PROJECT.md.

**Verified:** 2026-08-19
**Status:** passed
**Re-verification:** No — initial verification

**Scope note (binding on this verification):** Phase 66 is deliberately verdict-only (D-01: zero
source files modified; D-02: zero GitHub tracker writes), confirmed by an explicit human checkpoint
at the start of execution (`drafts-only` selected). Per the phase brief's explicit instruction,
ROADMAP criterion 5's "represented by a GitHub issue" — and, by the identical "fixed or filed"
structure, criterion 3 — are judged against whether the phase honestly produced filing-ready drafts
and stated the Phase 69 dependency, not against whether issues exist on the tracker. The phase's own
close-out answers these two criteria "Partially Met" rather than "Met" — this is the **correct,
approved outcome** of the deliberate scope decision, not a phase failure, and is not treated as a
gap below.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria — the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CPU stability in multi-project workspaces (#232) has a landed mitigation or an issue update with a concrete implementation plan | ✓ VERIFIED | `## DEBT-01` in `66-COVERAGE.md`: cites `P61-D3-003`, currency-checks all 4 anchors (all `current`, zero drift — independently re-confirmed against `bbj-scope.ts:308-330`, `bbj-scope-local.ts:106-118`, `bbj-index-manager.ts:14-28`, `bbj-linker.ts:41-58`), names a concrete two-mechanism edit (cache for `getBBjClassesFromFile`, `treeIter.prune()` for `collectLocalSymbols`). #232 confirmed CLOSED (draft supersedes it). |
| 2 | The 3 disabled `parser.test.ts` assertions and the skipped TEST-03 case are each re-enabled or documented with the specific blocker and unblocking condition | ✓ VERIFIED | `## DEBT-02`: two separate records (`P66-D5-001`, `P66-D5-002`) with two distinct unblocking conditions (repo-local Java classpath fixture vs. upstream Langium grammar follower). Sites independently confirmed at exact recorded lines: `parser.test.ts:530,811,860`, `completion-test.test.ts:185`. |
| 3 | The static method return-type inference gap and the FQN static-only completion filtering gap are each fixed or filed | ⚠ Partially Met (by design, not a gap — see scope note) | `## DEBT-03` (`P66-D2-001`, easy-fix) and `## DEBT-04` (`P66-D2-002`, major-refactor) both carry complete, evidence-grounded issue-ready drafts naming the exact edit; neither is fixed (D-01) nor literally filed (D-02). Trace claims independently verified against `bbj-type-inferer.ts:73-76` and `bbj-scope.ts:191-234`/`bbj-completion-provider.ts` (no `isClassRef`/`isStatic` match, confirming DEBT-04's "provider adds no filtering of its own" claim). |
| 4 | LSP4IJ's 19 experimental API usages and the `BbjCompletionFeature` coupling have a current risk assessment against the installed LSP4IJ version | ✓ VERIFIED | `## DEBT-05`: baseline counts re-derived live and independently re-confirmed (`0`, `11`, `20` — exact match). Nine-target `javap -v` annotation table against the actual cached `lsp4ij-0.19.0.jar` (byte size and path independently confirmed); spot-checked 3 of 9 `javap` results directly — `LSPCompletionFeature` class-level `@ApiStatus.Experimental` confirmed present at the exact described position, `LanguageServerFactory` confirmed to carry zero `ApiStatus` references, `getIcon` confirmed to carry no member-level annotation. "19" figure's provenance traced to and confirmed verbatim in `49-01-VERIFICATION.md:84`. |
| 5 | Every one of these 6 items ends the milestone represented by a merged fix or a GitHub issue — none remain as PROJECT.md prose only | ⚠ Partially Met (by design, not a gap — see scope note) | Prose half fully discharged: `PROJECT.md`'s 8 bullets each independently confirmed to carry a `P66-*` ID, `DEBT-NN`, and disposition; zero "not yet mapped" wording remains. Tracker half honestly stated as pending Phase 69 — no bullet or record claims issue representation; each explicitly reads "(drafted; issue number backfilled by Phase 69)". |

**Score:** 5/5 roadmap criteria discharged as designed (3 fully Met, 2 honestly Partially Met per the
approved verdict-only scope — this is the correct outcome, not a shortfall).

### Additional Phase-Specific Truths (from PLAN frontmatter must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | 8-row Debt Denominator Register enumerates every PROJECT.md bullet, no blank cell | ✓ VERIFIED | `sed -n '/^## Debt Denominator Register/,/^## /p' ... \| grep -cE '^\| *25[0-7] '` → `8`. All 8 rows carry a real disposition; the phase's own close-out `### A` table independently re-confirms this with the identical 8 rows. |
| 7 | `DEBT-07`/`DEBT-08` added to `REQUIREMENTS.md` as bullets and coverage-matrix rows, closing the 8-vs-6 drift `INVENTORY.md:1220` recorded | ✓ VERIFIED | Both present: `- [ ] **DEBT-07**...`, `- [ ] **DEBT-08**...` and `\| DEBT-07 \| Phase 66 \| Pending \|`, `\| DEBT-08 \| Phase 66 \| Pending \|`. `INVENTORY.md:1220` independently confirmed to record the drift and name "added as a new one" as a legal resolution. Coverage totals confirmed `40 total / 40 mapped / 0 unmapped`. |
| 8 | `INVENTORY.md` unchanged by this phase | ✓ VERIFIED | `git diff --stat 6222daa~1..HEAD -- .planning/reviews/INVENTORY.md` → empty. |
| 9 | The five closed `6N-COVERAGE.md` files (61-65) unchanged | ✓ VERIFIED | `git diff --stat 6222daa~1..HEAD -- .planning/reviews/6{1,2,3,4,5}-COVERAGE.md` → empty. |
| 10 | Zero source files outside `.planning/` modified | ✓ VERIFIED | `git diff --name-only 6222daa~1..HEAD \| grep -v '^\.planning/'` → empty; `git diff --stat -- bbj-vscode bbj-intellij java-interop .github` → empty. |
| 11 | Zero GitHub tracker writes occurred | ✓ VERIFIED | `grep -rnE "gh issue (create\|comment\|edit\|close\|reopen)\|gh label..."` over the phase directory returns only prose describing the prohibition itself, never an executed command. Only `gh issue view 232`/`gh issue view 466` (read-only) are referenced. |
| 12 | Every `PROJECT.md` bullet carries its `P66-*` finding ID, `DEBT-NN`, and disposition | ✓ VERIFIED | `sed -n '/^\*\*Known tech debt:/,/^## /p' PROJECT.md \| grep -c 'P66-'` → 8 occurrences confirmed; each of the 8 bullets independently read and confirmed to carry the suffix. |
| 13 | All 4 D-15 close-out gates (Denominator, Criterion, Requirement, Boundary) re-derived live with literal output | ✓ VERIFIED | `## Phase 66 Close-Out` sections A-D present; every cited command's literal output independently re-run and matched exactly (denominator `8`; boundary `git status --porcelain` empty over all trees; `git log --oneline -- INVENTORY.md \| head -1` → `1dcab8b...` matches). |
| 14 | Every `effort:` on `{2,4,8}` scale; every `disposition:` from INVENTORY's 6-value vocabulary | ✓ VERIFIED | All 8 `effort:` lines: `8,4,8,4,4,8,2,2` — all in `{2,4,8}`. All 8 `disposition:` lines: `major-refactor` ×6, `easy-fix` ×1, `wontfix` ×1 — all in vocabulary. |
| 15 | Two PROJECT.md bullets mapping to the same requirement (DEBT-02, lines 253/254) stay separate register rows/finding IDs | ✓ VERIFIED | Register rows 253 (`P66-D5-002`) and 254 (`P66-D5-001`) are distinct rows with distinct IDs and distinct issue drafts, never merged. |

**Score:** 15/15 must-haves verified.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.planning/reviews/66-COVERAGE.md` | 2060-line re-triage record: header, 8-row register, 8 debt-item sections, close-out | ✓ VERIFIED | Exists, all 19 expected `## ` sections present in correct order; every finding ID, effort, disposition confirmed. |
| `.planning/REQUIREMENTS.md` | DEBT-07/08 bullets + matrix rows | ✓ VERIFIED | Present, arithmetic closes at 40/40/0. |
| `.planning/PROJECT.md` | §"Known tech debt" rewritten with pointers | ✓ VERIFIED | 8 bullets preserved, each carries ID/requirement/disposition, header points at `66-COVERAGE.md`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `66-COVERAGE.md` | `61-COVERAGE.md` | inherited-evidence citation (P61-D(2\|3\|5)-0(03\|09\|10\|11)) | ✓ WIRED | 19 matches; each cited ID independently confirmed to exist in `61-COVERAGE.md`. |
| `66-COVERAGE.md` | `63-COVERAGE.md` | `P63-D4-010` DEBT-05 citation | ✓ WIRED | 10 matches. |
| `66-COVERAGE.md` | `PROJECT.md` | register rows keyed to lines 250-257 | ✓ WIRED | All 8 line numbers present and correctly mapped. |
| `66-COVERAGE.md` | `INVENTORY.md` | disposition vocabulary verbatim | ✓ WIRED | 8/8 disposition lines match the vocabulary pattern. |
| `PROJECT.md` | `66-COVERAGE.md` | `P66-D[0-9]-00[0-9]` pointer per surviving bullet | ✓ WIRED | 8 matches, one per bullet. |
| `REQUIREMENTS.md` | `ROADMAP.md` | DEBT-07/08 matrix rows → Phase 66 | ✓ WIRED | 2 matches. |
| `66-COVERAGE.md` | `ROADMAP.md` | Criterion gate answers all 5 criteria | ✓ WIRED | 12 `criterion [1-5]` matches; all 5 explicitly answered. |

### Data-Flow / Evidence-Grounding Trace (Level 4 — the core adversarial check for a claims-only deliverable)

Because this phase's entire deliverable is prose making factual claims about code, the highest-value
check is not wiring but **independent re-derivation of the underlying facts**. The following claims
were re-run/re-read independently of the SUMMARY/COVERAGE text and matched exactly:

| Claim | Independent re-check | Result |
|-------|----------------------|--------|
| `getBBjClassesFromFile`/`collectLocalSymbols`/`isAffected`/`link()` line anchors (DEBT-01) | `grep -n` against actual `bbj-scope.ts`, `bbj-scope-local.ts`, `bbj-index-manager.ts`, `bbj-linker.ts` | Exact match, including the claimed line shifts |
| `parser.test.ts`/`completion-test.test.ts` disabled/skip sites (DEBT-02) | `grep -n "DISABLED"` / direct read at line 185 | Exact match |
| `bbj-type-inferer.ts:73-78` fallback-less `isJavaMethod` branch (DEBT-03) | Direct read of lines 65-85 | Exact match |
| `bbj-scope.ts:191-234` `isClassRef` detection + completion-provider non-filtering (DEBT-04) | Direct read + `grep -n "isClassRef\|isStatic" bbj-completion-provider.ts` (expected: none) | Exact match, zero matches as claimed |
| `java-interop.ts:579,584` `isStatic ?? false` default | `grep -n "isStatic"` | Exact match |
| `59-04-SUMMARY.md`'s "MemberCall isClassRef extension dropped" quote | `grep -n` in archived file | Verbatim match |
| LSP4IJ baseline counts `0`/`11`/`20` (DEBT-05) | Re-ran all 3 `grep` commands | Exact match |
| Cached jar path/size, gradle pin `0.19.0` | `ls -la`, `grep -n` on `build.gradle.kts:27` | Exact match |
| `LSPCompletionFeature` class-level `@ApiStatus.Experimental` | `javap -v` re-run independently | Confirmed present at the described position |
| `LanguageServerFactory` zero `ApiStatus` references | `javap -v \| grep -c ApiStatus` | Confirmed `0` |
| `getIcon` member carries no `@ApiStatus` annotation | `javap -v` output inspected | Confirmed — only `@Nullable` |
| "19" provenance → `49-01-VERIFICATION.md:84` | Direct read | Verbatim quote match |
| `applyDiagnosticHierarchy` called from exactly one place (DEBT-07) | `grep -rn "applyDiagnosticHierarchy" bbj-vscode/src/language/` | Exactly 2 hits: definition + the one call site |
| `applyDiagnosticHierarchy` never imported/called in `bbj-document-builder.ts` | `grep -n` | Zero matches, as claimed |
| Langium's `super.validateDocument` seeds `const diagnostics = [];` | Direct read of `node_modules/langium/lib/validation/document-validator.js:25` | Exact match |
| TextMate bundle `filenames`/`extensions` collision (DEBT-08) | Direct read of `package.json` | Exact match |
| `P64-D6-010` cited as DEBT-08 blocker, not re-triaged | Confirmed citation present, no edit to `64-COVERAGE.md` | Consistent |
| Phase-wide empty diff since swept SHA `1750ad74...` | `git diff --name-only` re-run | Empty, as claimed |
| `git log --oneline -- INVENTORY.md \| head -1` (boundary gate) | Re-run | Matches `1dcab8b...` exactly |

No fabricated, asserted-but-unrun, or misattributed evidence was found anywhere this was checked.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| DEBT-01 | 66-01 | CPU stability re-triage | ✓ SATISFIED | `## DEBT-01`, `P66-D3-001` |
| DEBT-02 | 66-01 | Disabled assertions + TEST-03 | ✓ SATISFIED | `## DEBT-02`, `P66-D5-001`/`002` |
| DEBT-03 | 66-01 | Static return-type gap | ✓ SATISFIED | `## DEBT-03`, `P66-D2-001` |
| DEBT-04 | 66-02 | FQN static-only filtering | ✓ SATISFIED | `## DEBT-04`, `P66-D2-002` |
| DEBT-05 | 66-02 | LSP4IJ experimental coupling | ✓ SATISFIED | `## DEBT-05`, `P66-D4-001` |
| DEBT-06 | 66-03 | Closure gate | ✓ SATISFIED (honestly, as "not complete" per its own tracker-half wording) | `## DEBT-06 closure`; REQUIREMENTS.md checkbox correctly left unchecked |
| DEBT-07 | 66-03 (new) | CPL-06 timing nuance orphan | ✓ SATISFIED | `## DEBT-07`, `P66-D2-003` |
| DEBT-08 | 66-03 (new) | TextMate bundle orphan | ✓ SATISFIED | `## DEBT-08`, `P66-D5-003` |

No orphaned requirements: all `DEBT-*` IDs mapped to Phase 66 in `REQUIREMENTS.md`'s coverage matrix
appear in at least one plan's declared requirements or were explicitly created by this phase per D-05.

### Anti-Patterns Found

None. Scanned all phase-modified files (`66-COVERAGE.md`, `REQUIREMENTS.md`, `PROJECT.md`) for
`TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` — the only hits are pre-existing, unrelated content
(`PROJECT.md:167`, a v3.8 historical note about "4 production FIXMEs resolved") and the phrase "not
yet implemented" inside the DEBT-01 register row's own bullet-text quotation, not a stub marker.

### Behavioral Spot-Checks

N/A — this phase produces planning artifacts, not runnable code. The equivalent rigor was applied
via the Data-Flow / Evidence-Grounding Trace above (independent re-derivation of every checkable
factual claim), which is the correct proxy for a claims-only deliverable.

### Probe Execution

N/A — no probes declared or applicable to this phase.

### Human Verification Required

None. All truths are objectively checkable via source inspection, `git`, and `javap`, all of which
were independently re-run during this verification. The phase's one `checkpoint:decision` (Task 1 of
66-01, the tracker-boundary gate) was already resolved by the user (`drafts-only`) before execution
continued, per the phase brief's own confirmation and per the recorded resume signal in
`66-01-SUMMARY.md`.

### Gaps Summary

No gaps. Every hard boundary (zero source-file changes, zero tracker writes, `INVENTORY.md` and the
five closed `6N-COVERAGE.md` files immutable) was independently re-verified via `git` and holds.
Every must-have truth from all three plans' frontmatter is satisfied. Every substantive
investigative claim (DEBT-01 currency check, DEBT-04's static trace, DEBT-05's jar measurement,
DEBT-07's call-graph trace) was independently spot-checked against the actual repository and matched
exactly — this phase's evidence is real, not fabricated or asserted. `DEBT-07`/`DEBT-08` correctly
close the 8-vs-6 drift as both bullets and coverage-matrix rows. `PROJECT.md`'s debt list is
rewritten as pointers into the evidence base, not left as bare prose. Criteria 3 and 5 are honestly
reported "Partially Met" rather than overclaimed — exactly the correct behavior for a phase whose
verdict-only scope was explicitly approved by the user at Task 1's checkpoint, and exactly what the
phase brief instructed this verification to treat as success rather than failure.

---

*Verified: 2026-08-19*
*Verifier: Claude (gsd-verifier)*
