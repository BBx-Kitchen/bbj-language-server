# Phase 119: Grammar — DECLARE File Paths & Shared Channel Opening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-28
**Phase:** 119-grammar-declare-file-paths-shared-channel-opening
**Areas discussed:** Shared fragment shape, File-path token fix, #527 already-fixed path, Evidence & closing

---

## Shared fragment shape

| Option | Description | Selected |
|--------|-------------|----------|
| Opening-only fragment | Shared `'(' channelno=Expression? Options?`, tails per variant, AST unchanged | ✓ |
| One guarded fragment | `<Output>`/`<!Output>` guards; may widen `items` type | |
| Keep separate + rationale | No grammar change, comment only | |

| Option (Output-only alternatives) | Description | Selected |
|--------|-------------|----------|
| Keep + document | Stay on Output; comment explains the trailing comma that suppresses the line end | ✓ |
| Add them to Input too | Symmetric; changes parse outcomes | |
| You decide | Researcher checks BBj docs | |

| Option (bare-items tail) | Description | Selected |
|--------|-------------|----------|
| No, opening only | Avoids guards/AST risk | ✓ |
| Yes if AST unchanged | Try guards for tail | |

**User's choice:** Recommended options throughout.

---

## File-path token fix

| Option | Description | Selected |
|--------|-------------|----------|
| Non-greedy `/::.*?::/` | Smallest change | ✓ |
| Negated class (issue's form) | `/::[^:]*(?::[^:]+)*::/` | |
| You decide | | |

**Regression coverage (multi-select):** Two `use` on one line ✓, Single-colon paths ✓, Other QualifiedClass sites ✓ (not "#527 line only").

| Option (assertion) | Description | Selected |
|--------|-------------|----------|
| Yes, targeted test | Assert two VariableDecls with own file-path tokens, no validation errors | ✓ |
| Test-data file only | Rely on example-files.test.ts | |

---

## #527 already-fixed path

| Option | Description | Selected |
|--------|-------------|----------|
| Still fix the regex | Keep regression and make terminal non-greedy anyway | ✓ |
| Close on evidence only | Leave terminal, close on passing test | |

| Option (unresolved paths in test) | Description | Selected |
|--------|-------------|----------|
| Real lib files | lib1/lib2 docs define ClassA/ClassB so references resolve | ✓ |
| Filter linking errors | Weaker | |
| You decide | | |

---

## Evidence & closing

| Option (probe) | Description | Selected |
|--------|-------------|----------|
| Per-file error sets | Messages + positions per file, base vs head; corpus by file set | ✓ |
| Per-file error counts | Cheaper | |
| Plus AST shape diff | Strongest, more work | |

| Option (record) | Description | Selected |
|--------|-------------|----------|
| SUMMARY + VERIFICATION | Throwaway probe, results in docs | ✓ |
| Committed probe script | Reusable tool | |

| Option (closing) | Description | Selected |
|--------|-------------|----------|
| Via milestone PR lines | `Closes #527` / `Closes #602` | ✓ |
| Close manually now | | |

---

## Claude's Discretion

- Fragment name/placement, regression and test file names, exact single-colon examples, plan split, probe mechanism.

## Deferred Ideas

None. Three keyword-matched todos were reviewed and not folded, because they are unrelated to the grammar.
