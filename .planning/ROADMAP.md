# Roadmap: BBj Language Server

## Milestones

- v1.0 Internal Alpha - Phases 1-6 (shipped 2026-02-01)
- v1.1 Polish & Run Commands - Phases 7-10 (shipped 2026-02-02)
- v1.2 Run Fixes & Marketplace - Phases 11-13 (shipped 2026-02-02)
- v2.0 Langium 4 Upgrade - Phases 14-20 (shipped 2026-02-04)
- v2.1 Feature Gap Analysis - N/A (shipped 2026-02-04)
- v2.2 IntelliJ Build & Release Automation - Phases 21-23 (shipped 2026-02-05)
- v3.0 Improving BBj Language Support - Phases 24-27 (shipped 2026-02-06)
- v3.1 PRIO 1+2 Issue Burndown - Phases 28-31 (shipped 2026-02-07)
- v3.2 Bug Fix Release - Phases 32-34 (shipped 2026-02-08)

## Phases

<details>
<summary>v1.0 through v3.1 (Phases 1-31) - SHIPPED</summary>

See .planning/MILESTONES.md for full history.

</details>

### v3.2 Bug Fix Release (Complete)

**Milestone Goal:** Fix regressions and parser bugs that produce false errors on valid BBj code, restoring broken functionality and eliminating noise in the diagnostics output.

- [x] **Phase 32: Regression Fixes** - Restore BBjAPI() resolution and USE statement navigation
- [x] **Phase 33: Parser and Lexer Fixes** - Eliminate false errors on valid BBj syntax patterns
- [x] **Phase 34: Diagnostic Polish** - Improve settings labels and USE path validation

## Phase Details

### Phase 32: Regression Fixes
**Goal**: BBjAPI() resolves correctly and USE statement navigation works again -- restoring functionality that broke in v3.1
**Depends on**: Nothing (first phase, highest priority)
**Requirements**: REG-01, REG-02
**Success Criteria** (what must be TRUE):
  1. Typing `api! = BBjAPI()` produces no linker error and `api!` has type `BBjAPI`
  2. Code completion works on variables assigned from `BBjAPI()` (e.g., `api!.` shows methods)
  3. Ctrl-click on a class name in a `USE` statement navigates to the class definition file resolved via PREFIX path
  4. No regressions in existing linker or navigation tests
**Plans:** 3 plans
Plans:
- [x] 32-01-PLAN.md -- BBjAPI() built-in synthetic class and linker fix
- [x] 32-02-PLAN.md -- USE statement Ctrl-click navigation (DefinitionProvider)
- [x] 32-03-PLAN.md -- Manual verification + onDidChangeConfiguration regression fix

### Phase 33: Parser and Lexer Fixes
**Goal**: Valid BBj syntax patterns that currently produce false errors parse cleanly without diagnostics
**Depends on**: Phase 32 (regressions first)
**Requirements**: PARSE-01, PARSE-02, PARSE-03, PARSE-04
**Success Criteria** (what must be TRUE):
  1. `method public void doSomething()` parses without flagging `void` as an unresolvable class
  2. `mode$` and other `$`-suffixed string variables inside DEF FN within class methods produce no lexer errors
  3. `select` statements with `from`/`where` clauses produce no false line-break validation errors
  4. `cast(BBjString[], someVar!)` with array type notation `[]` parses correctly
  5. Existing parser tests continue to pass (no regressions)
**Plans:** 3 plans
Plans:
- [x] 33-01-PLAN.md -- Fix void return type (PARSE-01) and cast array notation (PARSE-04, deferred)
- [x] 33-02-PLAN.md -- Fix DEF FN suffixed variables (PARSE-02) and add SELECT verb (PARSE-03)
- [x] 33-03-PLAN.md -- Gap closure: CastExpression grammar rule for array type notation (PARSE-04)

### Phase 34: Diagnostic Polish
**Goal**: Settings display the correct product name and USE statements with bad file paths get actionable error messages
**Depends on**: Phase 33 (fixes before polish)
**Requirements**: POL-01, POL-02
**Success Criteria** (what must be TRUE):
  1. VS Code settings panel shows "BBj" (capital B, capital B, lowercase j) in all setting labels, not "Bbj"
  2. A USE statement referencing a non-existent file path shows an error diagnostic on the file name portion of the USE statement
  3. USE statements with valid file paths show no new diagnostics
**Plans:** 3 plans
Plans:
- [x] 34-01-PLAN.md -- Fix settings capitalization (POL-01) and USE file path validation (POL-02)
- [x] 34-02-PLAN.md -- Gap closure: reconcile USE file-path diagnostics after PREFIX docs indexed
- [x] 34-03-PLAN.md -- Gap closure: fix URI comparison, add logging, include searched paths in error

## Progress

**Execution Order:**
Phases execute in numeric order: 32 -> 33 -> 34

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 32. Regression Fixes | v3.2 | 3/3 | Complete | 2026-02-07 |
| 33. Parser and Lexer Fixes | v3.2 | 3/3 | Complete | 2026-02-08 |
| 34. Diagnostic Polish | v3.2 | 3/3 | Complete | 2026-02-08 |
