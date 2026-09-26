---
status: resolved
trigger: "G-109-1: completion inside a class METHOD body offers program-scope variables (a$, x!) that a BBj method cannot see"
created: 2026-09-26T06:00:00Z
updated: 2026-09-26T18:00:00Z
resolved_by: "54efa29c fix(109-08): keep program variables out of class method scope; re-tested 109-UAT Test 33"
goal: find_root_cause_only
symptoms_prefilled: true
---

## Current Focus

bug_class: Bohrbug (deterministic — pure function of AST + localSymbols)
hypothesis: H1 — BbjScopeProvider.getScope's SymbolRef branch (bbj-scope.ts:288-313) delegates to Langium DefaultScopeProvider.getScope, which walks EVERY ancestor of the reference (MethodDecl -> BbjClass -> Program) and chains each ancestor's localSymbols; Program-level implicit-assignment variables (bbj-scope-local.ts:236-251, keyed on Program) are therefore in the scope of any SymbolRef inside a method body. Completion (Langium completionForCrossReference -> scopeProvider.getScope().getAllElements()) offers them; linking resolves to them too.
status_of_h1: CONFIRMED (probe on HEAD reproduces; scratch-worktree filter experiment removes the leak with zero new suite failures)
test: done — see Evidence 06:20 and 06:35
expecting: n/a
next_action: Hand back ROOT CAUSE FOUND to the orchestrator (goal find_root_cause_only); a gap-closure plan adds a MethodDecl boundary to SymbolRef scope resolution in bbj-scope.ts plus absence tests for program variables in method bodies

## Symptoms

expected: Inside a class METHOD ... METHODEND body, Ctrl+Space at a statement start offers method-local variables, parameters, keywords (and globals/fields via their own syntax) but NOT program-scope variables.
actual: With `a$="TEST"` and `X!="BLA"` at program scope and `class public Test / method public void t() / b$="KJK" / methodend / classend`, completion inside t() offers a$ and x!; b$ is correctly not offered outside the method.
errors: none
reproduction: 109-UAT.md Test 1 (VS Code / IntelliJ, fresh build of current tree)
started: discovered in phase 109 UAT 2026-09-26; 109-01 measured method-body completion against a program-scope control

## Eliminated

- hypothesis: the completion provider itself injects program-scope variables (e.g. via auto-import or a custom candidate pass)
  evidence: bbj-completion-provider.ts:98-108 only forwards super.completionForCrossReference items and adds Auto-import CLASS items at type-reference positions; removing Program-level variables from the scope provider alone removed a$/X! from completion (scratch experiment)
  timestamp: 2026-09-26T06:35:00Z

- hypothesis: BbjScopeComputation keys program variables on the wrong container (e.g. on a node that is an ancestor of the method only by accident)
  evidence: probe P4 — a$/X! keyed on Program, b$ keyed on MethodDecl, this!/t on BbjClass; exactly the intended containers
  timestamp: 2026-09-26T06:20:00Z

- hypothesis: case variance (X! declared vs x! typed) is involved
  evidence: scope is case-insensitive by design (bbj-scope.ts:393-396); `PRINT x!` in the method linked to the `X!` assignment; the offered label is the declaration spelling "X!"; the leak is independent of case
  timestamp: 2026-09-26T06:20:00Z

## Evidence

- timestamp: 2026-09-26T06:05:00Z
  checked: knowledge base / prior debug sessions
  found: no knowledge-base.md entry for method/program scope leakage (no match)
  implication: no known-pattern candidate; investigate from scratch

- timestamp: 2026-09-26T06:06:00Z
  checked: bbj-vscode/test/completion-method-body.test.ts (the 109-01 matrix) and 109-COMP03-MEASUREMENT.md
  found: inMethod() wraps ONLY the row body in `class/method/methodend/classend` — no program-scope statement exists in any in-method fixture. verdict() only computes `missingInMethod` (control labels absent in method) + row.expected/absent; nothing checks for EXTRA labels in method. No row declares a program-scope variable nor lists one in `absent`. The measurement table has "In method" > "Control" on every row (e.g. 147 vs 145) and the column reported is only "Control labels missing in method".
  implication: the 109-01 matrix is structurally blind to the leak — it neither creates a program-scope variable next to the class nor asserts absence of one. It does not bake the leak in as an expectation, but it cannot detect it; the "Every position returns the same candidates as its program-scope control" framing (and the UAT Test 1 wording "offers the same candidates as at program scope") encodes the wrong notion of correctness.

- timestamp: 2026-09-26T06:08:00Z
  checked: bbj-vscode/src/language/bbj-scope.ts getScope, SymbolRef branch (lines 274-313)
  found: for a SymbolRef without `#` instance access, scope = StreamScopeWithPredicate(importedBBjClasses(program), this.superGetScope(context)); superGetScope -> DefaultScopeProvider.getScope. No MethodDecl-specific filtering anywhere in the provider.
  implication: method-body SymbolRefs get whatever Langium's default ancestor walk produces

- timestamp: 2026-09-26T06:09:00Z
  checked: node_modules/langium/lib/references/scope-provider.js (Langium 4.3.1) DefaultScopeProvider.getScope lines 18-36
  found: `let currentNode = context.container; do { if (localSymbols.has(currentNode)) scopes.push(...) ; currentNode = currentNode.$container } while (currentNode)` — every ancestor up to the root contributes, innermost first, global scope last
  implication: a SymbolRef in MethodDecl.body sees MethodDecl locals, then BbjClass locals (fields, methods, this!/super!, accessors), then Program locals (every program-level variable), then globals

- timestamp: 2026-09-26T06:10:00Z
  checked: bbj-vscode/src/language/bbj-scope-local.ts processNode
  found: implicit assignment `a$="TEST"` (line 236-251) adds a FieldDecl-typed synthetic description to findScopeHolder(node) = the LetStatement's container = Program (via addToScope, which also unwraps CompoundStatement). Same for READ/DREAD/ENTER input vars (285-306, keyed on stmt.$container) and DIM ArrayDecl (307-321, keyed on node.$container.$container). Inside a method the same code keys on the MethodDecl, so method locals do not leak OUT (matches the user's "b$ correctly not offered outside").
  implication: containment is one-directional: inner scopes are isolated from the outside, but the Program scope is an ancestor of every method, so it leaks IN

- timestamp: 2026-09-26T06:11:00Z
  checked: bbj-vscode/src/language/validations/check-variable-scoping.ts
  found: validation treats Program and MethodDecl as separate scopes for use-before-assignment (Pass 1 per scope; Pass 2 prunes nested MethodDecl/BbjClass/DefFunction). But Pass 2 skips `child.symbol.ref === undefined` and `!declPositions.has(varName)` — a method-body read of a program-level a$ is linked (ref defined) but not in the method's declPositions, so it is silently skipped. No check flags a method referencing a program variable.
  implication: validation encodes the per-scope notion (method separate from program) for ordering only; it does not detect cross-scope reads, and it consumes the linker's (leaky) resolution. Completion has no separate decision — it inherits the scope provider.

- timestamp: 2026-09-26T06:12:00Z
  checked: bbj-vscode/src/language/bbj-linker.ts getCandidate (89-142)
  found: SymbolRef candidates come from this.scopeProvider.getScope(refInfo) — same provider as completion; no method-body filtering
  implication: linking (and therefore hover, go-to-definition, find-references, type inference on `a$` inside the method) share the same leaky scope path

- timestamp: 2026-09-26T06:20:00Z
  checked: temporary vitest probe bbj-vscode/test/zz-probe-scope-leak.test.ts (parseHelper + createBBjTestServices(EmptyFileSystem); deleted afterwards) on unmodified HEAD 243d70a6, user's exact fixture
  found: |
    P1 Ctrl+Space inside t(): variable labels = b$, this!, a$, X!  (148 labels total)  -> LEAK REPRODUCED
    P2 Ctrl+Space at program scope after classend: this!, a$, X!, probeTail — b$ absent (matches user: b$ correctly not offered outside)
    P3 `PRINT a$` / `PRINT x!` inside the method link to the program-level Assignment nodes (line 0 / line 1); `x!` (lower case) resolves to `X!` — case-insensitive scope; no diagnostic. `PRINT nowhere$` -> "Could not resolve reference" warning. Go-to-definition on a$ in the method jumps to program line 0. Hover returns nothing for variables either way.
    P4 localSymbols keys: Program -> [a$/FieldDecl, X!/FieldDecl, Test/BbjClass]; BbjClass -> [this!/FieldDecl, t/MethodDecl]; MethodDecl -> [b$/FieldDecl]
  implication: symbol collection is correct (a$/X! keyed on Program, b$ on MethodDecl); the leak is purely in scope RESOLUTION walking from MethodDecl up into Program. Case of X!/x! is irrelevant: the scope is case-insensitive (bbj-scope.ts:393-396), label keeps declaration spelling "X!".

- timestamp: 2026-09-26T06:25:00Z
  checked: BBj documentation, METHOD verb — https://documentation.basis.cloud/BASISHelp/WebHelp/commands/method_verb.htm (fetched with curl; bbj-docs MCP tool not available in this agent)
  found: "A method definition (a block of code between METHOD and METHODEND) defines a variable scope. The only variables that are visible within that scope are the parameters specified in the method parameter list and the fields defined in the class. Labels and local variables in a method are only visible within that method."
  implication: program-level a$/X! are NOT visible inside t(); offering/linking them is wrong. The LS's current behaviour contradicts the documented semantics.

- timestamp: 2026-09-26T06:35:00Z
  checked: falsification experiment in a SCRATCH git worktree (scratchpad/wt, detached HEAD, node_modules symlinked, generated/ copied; main tree untouched; worktree removed afterwards; diff kept at scratchpad/experiment-scope-filter.diff). Patched BbjScopeProvider SymbolRef branch to replicate Langium's ancestor walk but, when the reference is inside a MethodDecl, drop Program-keyed descriptions of type FieldDecl/VariableDecl/ArrayDecl (keep BbjClass, JavaClass-from-USE, DefFunction, globals)
  found: probe P1 -> only b$, this! (146 labels; a$/X! gone); P2 program scope unchanged (a$, X! still offered); P3 a$/x! inside method now UNRESOLVED ("Could not resolve reference" warning, same policy as nowhere$), definition -> none. Whole suite (--maxWorkers=2) on the experimental tree: 2848 tests, 11 failed = exactly the same 11 linking.test.ts "Interop related tests" names that fail on the unmodified main tree (verified by running linking.test.ts on main: same 11) — env drift baseline. Suite-level "failed" entries: parser-keyword-statements (hook timeout, passes when rerun serially), class-validations-issues (passes on rerun), installed-extension-e2e (0 failed tests, identical "failed" status on unmodified main) — all pre-existing/contention.
  implication: H1 CONFIRMED — removing Program-level variables from the method-body SymbolRef scope removes the leak in completion AND linking, and NO existing test depends on program variables being visible in a method body (no test encodes the leak as expected behaviour; none pins its absence either)

- timestamp: 2026-09-26T06:37:00Z
  checked: side observation from P2 (not part of G-109-1)
  found: at program scope on the line after `classend`, completion also offers `this!` (a BbjClass-keyed symbol) — the completion context node there appears to be the preceding BbjClass
  implication: separate minor anomaly in program-scope completion right after a class; not investigated further, not the reported gap

## Resolution

root_cause: |
  BbjScopeProvider.getScope (bbj-vscode/src/language/bbj-scope.ts:288-292) resolves a plain (non-#) SymbolRef through this.superGetScope(context) -> Langium 4.3.1 DefaultScopeProvider.getScope (node_modules/langium/lib/references/scope-provider.js:18-36), which chains the localSymbols of EVERY AST ancestor of the reference up to the root. For a SymbolRef in a class method body the chain is MethodDecl -> BbjClass -> Program, so the Program-keyed implicit-variable descriptions created by BbjScopeComputation (bbj-scope-local.ts:236-251 assignments, 285-306 READ/DREAD/ENTER inputs, 307-321 DIM arrays, 223-231 program-level DECLARE) are in scope inside every method. There is no MethodDecl boundary anywhere in the provider. Completion (Langium completionForCrossReference -> scopeProvider.getScope().getAllElements(), bbj-completion-provider.ts:98-108 adds nothing on top) therefore offers a$/X!, and the linker (bbj-linker.ts:89-142, same getScope) binds a$/x! inside the method to the program-level assignments — contradicting the documented BBj rule that a METHOD body sees only its parameters, its locals and the class fields. Scope COLLECTION is correct (method locals are keyed on MethodDecl and do not leak out); only RESOLUTION leaks inward. Contributing test gap: the 109-01 position matrix (bbj-vscode/test/completion-method-body.test.ts) never places a program-scope variable next to the class and verdict() only checks for labels MISSING in the method, never for EXTRA ones, so it cannot detect the leak; its "same as program scope" framing (also in UAT test 1's wording) is the wrong correctness notion.
reasoning_checkpoint:
  hypothesis: "Program-level variables appear in method-body completion because BbjScopeProvider's SymbolRef branch delegates to Langium's DefaultScopeProvider ancestor walk, which includes the Program's localSymbols for any node nested in a MethodDecl"
  confirming_evidence:
    - "Probe on HEAD: completion inside t() offers a$ and X!; a$/x! inside the method link to the program-level Assignment nodes and go-to-definition jumps to program line 0"
    - "localSymbols keys a$/X! on Program and b$ on MethodDecl (collection correct), so the only path putting a$ into the method's scope is the ancestor walk"
    - "Scratch-worktree experiment filtering Program-level variable descriptions for in-method SymbolRefs removes a$/X! from completion and linking while program-scope completion is unchanged"
  falsification_test: "If a$/X! were still offered in the method with the Program-level variable descriptions filtered out of the SymbolRef scope, the leak would come from another contributor (e.g. a completion-provider addition). Result: they disappeared -> not falsified"
  fix_rationale: "(not applied) A MethodDecl boundary in scope resolution addresses the cause for completion, linking, definition, references and type inference at once, rather than filtering completion items"
  blind_spots: "Whether program-level DEF FN functions and labels are visible from a method in real BBj was not verified (experiment kept DEF FN visible); whether BBj fields are reachable without '#' was not checked; real-corpus impact (new 'Could not resolve reference' warnings where code reads a same-named program variable inside a method) not measured against bbj-corpus; the this!-after-classend side anomaly not investigated"
  candidate_causes:
    - "code: BbjScopeProvider SymbolRef branch uses unbounded ancestor walk (CONFIRMED)"
    - "code: completion provider adds program symbols itself (ELIMINATED — completionForCrossReference only records/forwards super's items plus auto-import classes)"
    - "data: scope computation keys program vars on the wrong container (ELIMINATED — P4 shows correct keys)"
    - "test/config: 109-01 matrix fixture omits program variables and only checks missing labels (CONFIRMED as the reason it went undetected, not as the cause)"
  and_gate: "yes for the escape (defect in scope provider AND blind test oracle both needed for it to ship through phase 109); no for the defect itself (single code cause)"
fix: (not applied — goal find_root_cause_only)
verification: diagnosis only; leak reproduced on HEAD 243d70a6 and removed by a scratch-worktree experiment with zero new suite failures
files_changed: []
