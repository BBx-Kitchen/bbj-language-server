---
phase: 109-completion-java-class-resolution
verified: 2026-09-26T07:45:30Z
status: passed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found (UAT gap G-109-1, recorded in 109-UAT.md against a prior "passed"
    code-verification; the 109-08 gap-closure plan is the first VERIFICATION pass over the fix)
  previous_score: 5/5 (109-01..07 must-haves only; the 109-08 must-have below did not exist yet)
  gaps_closed:
    - "G-109-1: inside a class METHOD body, completion offered program-scope variables (a$, X!
      in the user's reported program) and linking bound them, though BBj gives a method its own
      variable scope. Closed by 109-08's lexicalScope() METHOD boundary in bbj-scope.ts."
  gaps_remaining: []
  regressions: []
---

# Phase 109: Completion & Java Class Resolution Verification Report

**Phase Goal:** Completion offers the right members in the right places: statics only after a
fully-qualified Java class, the result type of the overload a call actually matches, and
candidates inside class method bodies. Class resolution sends the java-interop backend only real
class names, once each.
**Verified:** 2026-09-26T07:45:30Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 109-08, commits `54efa29c`, `ab0743e9`,
`6441b296`), closing UAT gap G-109-1 recorded in `109-UAT.md` Test 1 / Gaps section.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Criterion 1: fully-qualified Java class reference (no `USE`) offers only static members | ✓ VERIFIED (regression check) | Unaffected by 109-08. `git diff --stat 7b2e5d83 HEAD` for `bbj-scope.ts` shows the class-reference detection block (lines 192-254, the 109-07 fix) untouched by this plan's diff (which only touches the separate `lexicalScope()` method and its one call site). `test/completion-class-reference.test.ts` independently re-run: still covers this behavior; no regression |
| 2 | Criterion 2: an overloaded BBj/Java call gets the matched overload's return type; completion on the result follows it | ✓ VERIFIED (regression check) | `bbj-overload-selector.ts`/`bbj-type-inferer.ts` untouched by plan 109-08 (`git diff --stat 7b2e5d83 HEAD` for these two files: empty). `test/overload-return-type.test.ts` unaffected |
| 3 | Criterion 3: completion inside class method bodies works at every measured position, including the DEF FN `_f$`/`_t$` position, **and does not leak program-scope variables into a method body's candidate set** (the corrected notion of "works" this gap-closure plan establishes) | ✓ VERIFIED | Independently re-run `test/method-body-scope.test.ts` (6 tests) and `test/completion-method-body.test.ts` (11 pinned matrix rows + 11 env-gated measurement rows, skipped without `MEASURE_COMPLETION_OUT`): 17 passed, 11 skipped (skips are the measurement-only `describe.runIf` block, not a functional gap). Read `bbj-scope.ts` lines 374-414 directly: the new private `lexicalScope()` method mirrors Langium's `DefaultScopeProvider.getScope` ancestor walk exactly, adding one predicate clause that drops `VariableDecl`-subtype descriptions only at the `Program` node, and only when `AstUtils.getContainerOfType(context.container, isMethodDecl)` finds an enclosing method; wired into the plain-name `SymbolRef` branch (`memberAndImports`, line 292) in place of the prior unconditional `superGetScope(context)`. Read `test/method-body-scope.test.ts` directly: reproduces the user's exact reported program (`a$="TEST"`/`X!="BLA"` at program scope, `class Test`/`method t()` assigning `b$`) as a regression test — completion inside `t()` offers `b$`/`this!` and neither `a$` nor `X!` (case-insensitively); program scope still offers `a$`/`X!` and not `b$`; a program-variable read inside the method does not link (`ref.symbol.ref` undefined, standard Warning-severity `linking-error`); every program-variable kind (implicit assignment, DIM array, program DECLARE, READ target, FOR variable) is pinned unresolved inside a method and resolved at program scope; go-to-definition inside a method finds nothing for a program variable while program scope still finds line 0; parameters, locals, `#`-fields, `this!`, a USE'd class, a fully-qualified `java.lang` path and a program-level `DEF FN` all stay visible and resolved inside a method. Read `test/completion-method-body.test.ts` directly: `inMethod()` now plants `programOnly$`/`ProgramObj!` beside the class in every fixture, and `verdict()` computes `extraInMethod` — an in-method label absent from the control and not on `METHOD_SCOPE_ONLY_LABELS`/`row.allowExtra` — failing the row if any program-scope variable leaks in; all 11 rows pass |
| 4 | Criterion 4: cold start with debug logging shows no class lookup for a primitive, `void`, or array type | ✓ VERIFIED (regression check) | `java-interop.ts` confirmed byte-identical to phase base commit `7b2e5d83` (`git diff --stat` empty). `test/java-interop-local-types.test.ts` unaffected |
| 5 | Criterion 5: a nested class named `Outer.Inner` in one place and `Outer$Inner` in another resolves once, showing the same members for both spellings | ✓ VERIFIED (regression check) | `java-interop.ts` confirmed byte-identical to phase base commit; `test/java-interop-nested-class-names.test.ts` unaffected |
| 6 | G-109-1 is closed: linking, go-to-definition and references agree with completion because the boundary lives in the scope provider, not a completion-item filter | ✓ VERIFIED | The single call site (`bbj-scope.ts` line 292) feeds the same `Scope` object that `BBjLinker.getCandidate`, `completionForCrossReference` and the `DefinitionProvider` all consume — confirmed by reading `bbj-scope.ts`'s `getScope` (no separate filtering added to `bbj-completion-provider.ts` or `bbj-linker.ts`, both diff-empty since base). `method-body-scope.test.ts`'s linking and go-to-definition tests independently re-run and pass, proving the three LSP features agree in practice, not just by code-path inspection |

**Score:** 6/6 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `bbj-vscode/src/language/bbj-scope.ts` | a METHOD boundary on plain-name lookup: inside a MethodDecl, program-level variable descriptions are excluded from the container walk | ✓ VERIFIED | Read directly (lines 374-414): private `lexicalScope(context)` method, doc comment cites the METHOD verb URL and states the exclusion rule; wired at line 292 (`this.lexicalScope(context)` replacing `this.superGetScope(context)` in the plain-name branch's `memberAndImports`). `grep -c "this.lexicalScope(context)"` → 1 (call site) plus its own definition; `grep -c "VariableDecl.$type"` → 1, both as required by the plan's acceptance criteria |
| `bbj-vscode/test/method-body-scope.test.ts` | the user's program as a regression test, absence tests per program-variable kind, definition agreement and presence tests | ✓ VERIFIED | Read directly: 5 tests (absence x2 combined into 2, linking, kinds, definition, presence — 6 total in the `describe` block), covering every behavior the plan's must_haves list; all 6 independently re-run and pass |
| `bbj-vscode/test/completion-method-body.test.ts` | position matrix that plants program variables beside the class and flags extra labels | ✓ VERIFIED | Read directly: `PROGRAM_SCOPE_VARIABLES`, `METHOD_SCOPE_ONLY_LABELS`, `allowExtra` on two fixture-shape rows, `extraInMethod` computed and asserted empty (plus a lowercase-safe explicit assertion that no `PROGRAM_SCOPE_VARIABLES` name is offered) in every one of 11 matrix rows; all pass |
| `.planning/phases/109-completion-java-class-resolution/109-COMP03-MEASUREMENT.md` | addendum recording the corrected correctness notion and the matrix counts before and after the fix | ✓ VERIFIED | Read directly: `## Gap closure: program variables in method bodies` section present with a full before/after table (10 of 11 rows measured `broken` pre-fix, all 11 `works` fixed) and a note on the #561 comment wording predating this correction |
| `bbj-vscode/src/language/bbj-type-inferer.ts`, `java-interop.ts`, `bbj-completion-provider.ts`, `bbj-linker.ts`, `bbj-scope-local.ts`, `bbj.langium`, `test/bbj-test-module.ts` | must stay unchanged (plan's own prohibition: the boundary lives only in the scope provider's plain-name lookup) | ✓ VERIFIED | `git diff --stat 7b2e5d83 HEAD` for these seven files, independently re-run: empty output |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `BbjScopeProvider.getScope`'s plain-name `SymbolRef` branch | `lexicalScope()`'s method-bounded walk | `memberAndImports` built from `this.lexicalScope(context)` instead of `this.superGetScope(context)` | ✓ WIRED | Confirmed by reading `bbj-scope.ts` line 292 directly, and by the independently re-run user-program reproduction (completion inside `t()` excludes `a$`/`X!`) |
| `lexicalScope()`, at the `Program` node of the ancestor walk | exclusion of Program-keyed `VariableDecl`-subtype descriptions | `!(dropProgramVariables && this.astReflection.isSubtype(desc.type, VariableDecl.$type))`, `dropProgramVariables = isProgram(currentNode)` | ✓ WIRED | Confirmed by reading `bbj-scope.ts` lines 400-404 directly; the six program-variable kinds in the kinds fixture all independently verified unresolved inside the method and resolved at program scope |
| `lexicalScope()` | `BBjLinker.getCandidate` / `DefinitionProvider.getDefinition` / `CompletionProvider.getCompletion` | all three read the same `getScope` result; no separate filter added anywhere else | ✓ WIRED | `bbj-linker.ts`, `bbj-completion-provider.ts` confirmed diff-empty since base; `method-body-scope.test.ts`'s linking and go-to-definition tests, independently re-run, confirm the three features agree in practice |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| COMP-01 | 109-02, 109-07 | Static-only completion after a fully-qualified Java class reference | ✓ SATISFIED | Unaffected by 109-08 (regression-checked above); REQUIREMENTS.md line 38 shows `[x]` and Phase 109 mapping status "Complete" |
| COMP-02 | 109-03 | Overload-aware return type for completion/checks | ✓ SATISFIED | Unaffected by 109-08 (regression-checked above); REQUIREMENTS.md `[x]`/"Complete" |
| COMP-03 | 109-01, 109-06, 109-08 | Completion inside class method bodies measured, fixed/recorded, and corrected to also exclude program-scope leakage | ✓ SATISFIED | 109-08 closes G-109-1 against this requirement directly; REQUIREMENTS.md `[x]`/"Complete" — consistent with the code evidence above (unlike the prior verification pass, there is no documentation-sync lag this time: REQUIREMENTS.md was already ticked before this gap-closure plan, and the plan's own SUMMARY explicitly left it untouched by design, which is correct since COMP-03 was already marked complete and this is a gap-closure fix to an already-"Complete" requirement, not a first satisfaction) |
| JINT-01 | 109-04, 109-06 | Primitives/void/arrays never sent to the backend as class lookups | ✓ SATISFIED | Unaffected by 109-08; REQUIREMENTS.md `[x]`/"Complete" |
| JINT-02 | 109-05, 109-06 | Nested class resolved once regardless of spelling | ✓ SATISFIED | Unaffected by 109-08; REQUIREMENTS.md `[x]`/"Complete" |

No orphaned requirements: REQUIREMENTS.md's Phase 109 mapping (COMP-01, COMP-02, COMP-03, JINT-01,
JINT-02) exactly matches the phase's declared requirement set; 109-08 declares `requirements:
[COMP-03]` in its own frontmatter, a subset of the phase's union, not an addition.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `bbj-vscode/src/language/bbj-scope.ts` | 585 (pre-existing, unrelated to this diff) | `// TODO inspect \`use\` inside classes?` | ℹ️ Info | Pre-existing, not part of 109-08's diff |

No `TBD`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER` markers found in `bbj-scope.ts`'s, `method-body-scope.test.ts`'s
or `completion-method-body.test.ts`'s diff for plan 109-08 (independently grepped over the
`7b2e5d83..HEAD` range for `bbj-vscode/src bbj-vscode/test`). No planning identifiers (`D-NN`,
`COMP-0N`, `JINT-0N`, `109-0N`, `G-109-N`, `WR-NN`/`CR-NN`/`IN-NN`, `T-109-NN`) found added to
source or test text in that diff — register check independently re-run, clean (grep exit 1).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| The user's exact reported program: `a$`/`X!` not offered, not linked inside `t()`; still offered/linked at program scope; `b$`/`this!` still offered in-method | `cd bbj-vscode && npx vitest run test/method-body-scope.test.ts` | 6/6 pass | ✓ PASS |
| Matrix: no `programOnly$`/`ProgramObj!` leak into any in-method candidate set (11 rows) | `cd bbj-vscode && npx vitest run test/completion-method-body.test.ts` | 11 pinned pass, 11 measurement-only skipped (env-gated) | ✓ PASS |
| Neighbouring suites unaffected (`variable-scoping.test.ts`, `completion-test.test.ts`, `definition.test.ts`) | `cd bbj-vscode && npx vitest run test/variable-scoping.test.ts test/completion-test.test.ts test/definition.test.ts` (run together first, then `variable-scoping.test.ts` alone after a `beforeAll` hook timeout under contention) | Together: 1 failed suite (`beforeAll` hook timeout, `numFailedTests` unaffected — a pre-existing contention pattern, not a regression). Alone: 49/49 pass | ✓ PASS |
| Scope-boundary/prohibited files untouched since phase base | `git diff --stat 7b2e5d83 HEAD -- bbj-vscode/src/language/bbj-completion-provider.ts bbj-vscode/src/language/bbj-linker.ts bbj-vscode/src/language/bbj-scope-local.ts bbj-vscode/src/language/bbj-type-inferer.ts bbj-vscode/src/language/bbj.langium bbj-vscode/test/bbj-test-module.ts bbj-vscode/src/language/java-interop.ts` | empty output | ✓ PASS |
| tsc | `cd bbj-vscode && npx tsc -p tsconfig.json` | exit 0, no errors | ✓ PASS |
| Register check (no planning identifiers in 109-08's diff) | `git diff 7b2e5d83 HEAD -- bbj-vscode/src bbj-vscode/test \| grep -E '^\+' \| grep -E 'D-[0-9]{2}|(COMP|JINT)-0[1-3]|109-0[1-9]|G-109-[0-9]+|(CR|WR|IN)-[0-9]{2}|T-109-[0-9]+'` | no match (exit 1) | ✓ PASS |
| Whole-suite regression (orchestrator-supplied, not re-run in full here per the single-full-run rule) | `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` | `numFailedTests=1 numTotalTests=2854` (the one failure is `installed-extension-e2e.test.ts`, an environment issue against a stale installed VSIX, unrelated to this plan's diff — confirmed by the orchestrator's own note and by this plan's own tree containing no METHOD-related change to that fixture) | ✓ PASS (environment, not regression) |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` probes. The plan's own private
diagnostic probe (`test/zz-method-scope-probe.test.ts`) was a temporary, never-committed file
(confirmed deleted: it does not exist in the current tree) used only to measure the corpus-wide
side effect of the fix, recorded in the SUMMARY (0 in-repo added/removed across 24 method files;
8 corpus-only Warning-severity `linking-error` additions, all classified as the expected side
effect, across 834 method files) — not a repo-tracked conformance probe.

### Human Verification Required

None. Every roadmap criterion, and the closed UAT gap G-109-1, are verifiable through the
language server's own test suite and direct source reading. The fix is a deterministic scope-
provider change with no runtime/external-service dependency.

### Gaps Summary

No gaps. Plan 109-08 closed UAT gap G-109-1 (`109-UAT.md` Test 1 / Gaps section): completion
inside a class METHOD body offered program-scope variables (`a$`, `X!` in the user's reported
program) and linking bound them, though a BBj METHOD body is documented to have its own variable
scope (only the method's parameters and the class's fields are visible there).

The fix adds a private `lexicalScope()` method to `BbjScopeProvider` that mirrors Langium's own
`DefaultScopeProvider.getScope` ancestor walk exactly, with one added exclusion: at the `Program`
node of the walk, descriptions whose type is a `VariableDecl` subtype (`FieldDecl`, `ArrayDecl`,
`VariableDecl` itself — covering implicit assignments, READ/DREAD/ENTER targets, FOR variables,
DIM arrays and program-level DECLAREs) are dropped, and only when the reference sits inside a
`MethodDecl`. Every reference outside a method takes the unmodified `superGetScope(context)` path.
Because completion, linking, go-to-definition and type inference all resolve through this same
`getScope`, all four now agree that a method cannot see the program's own variables — verified
directly, not just by code-path inspection, via `method-body-scope.test.ts`'s linking and
go-to-definition tests.

The `test/completion-method-body.test.ts` matrix, which previously could only detect *missing*
candidates in a method body, was extended with `extraInMethod` detection: two program-level
variables are now planted beside the class in every fixture, and a row fails if either one leaks
into the in-method candidate set. This corrects the matrix's prior notion of "works" (same
candidates as a program-scope control), which the UAT gap showed was the wrong standard — a
method's correct candidate set is its own scope, not the program's.

Every file the plan was scoped to leave untouched
(`bbj-type-inferer.ts`, `java-interop.ts`, `bbj-completion-provider.ts`, `bbj-linker.ts`,
`bbj-scope-local.ts`, `bbj.langium`, `test/bbj-test-module.ts`) was independently confirmed
byte-identical to the phase base commit `7b2e5d83`, so criteria 1, 2, 4 and 5 (already fully
verified in the previous pass) carry no regression risk from this plan. The one apparent whole-
suite anomaly during re-verification (`variable-scoping.test.ts` failing under contention when run
alongside two other suites) reproduced as a clean 49/49 pass when re-run alone, matching this
project's known `beforeAll`-hook-timeout-under-worker-contention pattern, not a regression from
this plan's diff.

One residual, deliberately out-of-scope looseness, carried over from the plan's own "Settled
questions" and repeated here for visibility: a bare field name (no `#` prefix) is still offered and
linked inside a method today, even though BBj requires `#` for direct field access from a method
body. This is a separate, narrower looseness the plan explicitly did not fix (removing class-keyed
entries wholesale would also remove `this!`), and does not block this phase's goal or any of its
five roadmap success criteria.

---

_Verified: 2026-09-26T07:45:30Z_
_Verifier: Claude (gsd-verifier)_
