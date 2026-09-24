# Phase 100: Parser Gaps — Remaining Groups, Long Tail & Examples - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-21
**Phase:** 100-Parser Gaps — Remaining Groups, Long Tail & Examples
**Areas discussed:** Re-scope to real shapes, Words-as-names claim, Long-tail residue list, examples/ clean-up policy

---

## Scout findings presented before the discussion

A per-file look at the harness details (52 list-A files) and a throwaway parse probe (deleted
after the run) showed: the roadmap's `PRINT` item forms and all fourteen named words already
parse; about 29 files fail on the empty-bracket whole-array form `name[]`; about 8 on `; rem`
after block boundaries and line-numbered class code; about 15 one-off shapes remain. `bbjcpl`
over `examples/`: 19 of 94 files fail, two of which are not programs.

## Todo folding

| Option | Description | Selected |
|--------|-------------|----------|
| Do not fold (Recommended) | Validator fix, not a parser gap; A2 gate already met; stays pending for a quick task | ✓ |
| Fold it in | Adds one validator plan; A2 would drop to about 18 | |

**User's choice:** Do not fold.
**Notes:** Concerns "Loosen single-line IF balance rule for the 5 re-flagged valid files". The
other four matches were keyword hits on IntelliJ / test-harness todos, reviewed and not folded
in Phases 98 and 99.

---

## Re-scope to real shapes

### Amend ROADMAP.md and REQUIREMENTS.md?

| Option | Description | Selected |
|--------|-------------|----------|
| Amend, keep old shapes as cases (Recommended) | Criterion 1 and PARSE-04/05 reworded around the empty-bracket form; already-parsing shapes stay as must-keep-parsing cases | ✓ |
| Leave wording, note it in CONTEXT | The verifier would check criteria that are already true | |

### How far should `name[]` be accepted?

| Option | Description | Selected |
|--------|-------------|----------|
| Anywhere an array element can stand (Recommended) | One root change; may accept a few forms the compiler rejects — B recorded with evidence | ✓ |
| Only the positions seen in the corpus | Separate alternatives per position; tighter, more edits | |

### AST treatment of the empty form

| Option | Description | Selected |
|--------|-------------|----------|
| Same node as [all] (Recommended) | Existing array-element node flagged whole-array; no provider changes | ✓ |
| You decide | Researcher picks the smallest correct diff | |

### Type-side shapes (`declare int[][]`, `BBjArray dat[all]` parameter)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same group (Recommended) | Same brackets, same regression file | ✓ |
| Long tail instead | One-off shapes under the triage rules | |

**User's choice:** all four recommended options; then "Next area".

---

## Words-as-names claim

### What should PARSE-08 deliver?

| Option | Description | Selected |
|--------|-------------|----------|
| Oracle sweep, fix the mismatches (Recommended) | Compile every grammar keyword as variable / label / branch target with bbjcpl, fix every word the compiler accepts and the parser rejects | ✓ |
| Regression file for the 14 only | Lock in what works, fix only list-A words | |

### Fix style if the sweep finds many words

| Option | Description | Selected |
|--------|-------------|----------|
| Per word, like `label` in 99 (Recommended) | Predictable, no identifier regressions | ✓ |
| Generic mechanism allowed | One token-builder change for a class of keywords; riskier | |
| Cap it: corpus words plus the cheap ones | Record the rest as known residue | |

### Positions claimed

| Option | Description | Selected |
|--------|-------------|----------|
| Variable, label, branch target (Recommended) | Exactly criterion 3 | ✓ |
| Also method, field and parameter names | Broader | |

**User's choice:** all three recommended options; then "Next area".
**Notes:** Stated alongside the "next area" prompt and not objected to: words the compiler
rejects as names but the parser accepts are recorded by the sweep, not flagged.

---

## Long-tail residue list

### Fix depth

| Option | Description | Selected |
|--------|-------------|----------|
| Fix the cheap ones, record the rest (Recommended) | Small local grammar changes fixed; lexer work or new mechanisms recorded; target about A ≤ 10, gate stays 25 | ✓ |
| Stop at the gate | Leanest; about 15 valid shapes stay rejected | |
| Drive to zero | Largest phase; some one-offs disproportionate | |

### Form of the tracked list

| Option | Description | Selected |
|--------|-------------|----------|
| Shapes here, file ids in the corpus repo (Recommended) | One row per shape with count, reason, decision; per-file mapping stays private | ✓ |
| Opaque ids in the tracked list | One row per file, hashed id | |

### Reason categories

| Option | Description | Selected |
|--------|-------------|----------|
| Roadmap's three plus "too costly for now" (Recommended) | Adds "valid but disproportionate to fix now", naming the shape for a later milestone | ✓ |
| Only the roadmap's three | A valid shape not reached must then be fixed | |

### Location

| Option | Description | Selected |
|--------|-------------|----------|
| In the phase's 100-CONFORMANCE.md (Recommended) | Same file as runs and gate table | ✓ |
| A standing .planning/CONFORMANCE-RESIDUE.md | Survives phase archiving | |

**User's choice:** all four recommended options; then "Next area".

---

## examples/ clean-up policy

### Default for a failing example whose error is not its point

| Option | Description | Selected |
|--------|-------------|----------|
| Repair so it compiles, keep its point (Recommended) | Smallest edit; only error-demo files move | ✓ |
| Move everything failing, edit nothing | Fastest; loses valid demos from the compile-checked set | |

### Examples added as valid that the compiler rejects

| Option | Description | Selected |
|--------|-------------|----------|
| Check the form first, then decide per file (Recommended) | Repair to a valid spelling if one exists; otherwise move to invalid with "no diagnostic today" and file a todo; grammar not tightened | ✓ |
| Move to invalid, no investigation | Pin whatever the LS reports today | |

### What the test pins

| Option | Description | Selected |
|--------|-------------|----------|
| LS diagnostics per file, by line and message group (Recommended) | Sidecar expectation per invalid file, explicit "none today — compiler-only"; plus a BBj-gated bbjcpl test over all examples | ✓ |
| Only "has at least one error" | Simple; pins nothing specific | |

### Non-programs (`config.bbx`, `functions.bbl`)

| Option | Description | Selected |
|--------|-------------|----------|
| Stay put, excluded by extension (Recommended) | No moves; reason stated in the test | ✓ |
| Own folder `examples/non-programs/` | Tests referencing `config.bbx` updated | |

### Folder name and marking

| Option | Description | Selected |
|--------|-------------|----------|
| `examples/invalid/` + a short README (Recommended) | Flat folder, issue-numbered names kept | ✓ |
| `examples/deliberately-invalid/` | Self-explaining name, no README | |

### Mixed files

| Option | Description | Selected |
|--------|-------------|----------|
| Split: valid part stays, error part moves (Recommended) | Both halves stay useful | ✓ |
| Move the whole file | Fewer edits | |

**User's choice:** all six recommended options; then "I'm ready for context".

---

## Claude's Discretion

- Grammar mechanics of the empty-bracket form and multi-pair type brackets; their still-flagged cases.
- Grammar vs lexer for `; rem` after block boundaries; how line-numbered class code parses.
- Sweep scripting; sidecar format and test name for `examples/invalid/`.
- Which long-tail shapes count as cheap (planner proposes per shape).
- Plan split and order.

## Deferred Ideas

- Flagging names or forms the compiler rejects but the parser accepts — strict-check territory.
- Language words as class, method, field or parameter names.
- A statement beginning with a `::file::Class.method()` static call (unless cheap).
- Unfusing `'IOL='`.
- A standing residue file outside the phase folder — declined for now.
