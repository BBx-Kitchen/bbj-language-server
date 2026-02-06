# Roadmap: BBj Language Server

## Milestones

- v1.0 Internal Alpha - Phases 1-6 (shipped 2026-02-01)
- v1.1 Polish & Run Commands - Phases 7-10 (shipped 2026-02-02)
- v1.2 Run Fixes & Marketplace - Phases 11-13 (shipped 2026-02-02)
- v2.0 Langium 4 Upgrade - Phases 14-20 (shipped 2026-02-04)
- v2.1 Feature Gap Analysis - N/A (shipped 2026-02-04)
- v2.2 IntelliJ Build & Release Automation - Phases 21-23 (shipped 2026-02-05)
- **v3.0 Improving BBj Language Support** - Phases 24-27 (in progress)

## Phases

<details>
<summary>v1.0 through v2.2 (Phases 1-23) - SHIPPED</summary>

See .planning/MILESTONES.md for full history.

</details>

### v3.0 Improving BBj Language Support (In Progress)

**Milestone Goal:** Fix false errors on common BBj patterns, resolve crashes, improve type resolution for completion, and polish IDE features -- eliminating the most-reported pain points in the language server.

- [x] **Phase 24: Grammar & Parsing Fixes** - Eliminate false errors from valid BBj syntax patterns (completed 2026-02-06)
- [x] **Phase 25: Type Resolution & Crash Fixes** - Fix type conveyance for completion and USE statement crash (completed 2026-02-06)
- [ ] **Phase 26: CPU Stability** - Diagnose and fix 100% CPU in multi-project workspaces
- [ ] **Phase 27: IDE Polish** - Improve Structure View, run icons, completion triggers, and error messages

## Phase Details

### Phase 24: Grammar & Parsing Fixes
**Goal**: Common BBj syntax patterns that currently produce false errors are accepted by the parser without diagnostics
**Depends on**: Nothing (first phase of v3.0)
**Requirements**: GRAM-01, GRAM-02, GRAM-03, GRAM-04, GRAM-05
**Success Criteria** (what must be TRUE):
  1. `endif` or `swend` followed by `;rem` comment on the same line parses without error
  2. Camel-case method names containing embedded BBj keywords (e.g., `getResult`, `isNew`) parse as single identifiers, not split into keyword + identifier
  3. `DREAD` verb and `DATA` statement are recognized by the grammar and do not produce diagnostics
  4. `DEF FN` / `FNEND` blocks inside class methods parse without error
  5. A comment after colon line-continuation (`: REM ...`) parses without error
**Plans**: 2 plans

Plans:
- [x] 24-01-PLAN.md -- Lexer fix: keyword/identifier disambiguation via longer_alt (GRAM-02)
- [x] 24-02-PLAN.md -- Grammar fixes: inline REM, DREAD/DATA, DEF FN in methods (GRAM-01, GRAM-03, GRAM-04, GRAM-05)

### Phase 25: Type Resolution & Crash Fixes
**Goal**: CAST(), super class fields, implicit getters, and DECLARE all correctly contribute type information for downstream completion, and USE statements with inner classes no longer crash the server
**Depends on**: Phase 24 (grammar must be correct before type resolution can work on parsed AST)
**Requirements**: TYPE-01, TYPE-02, TYPE-03, TYPE-04, STAB-01
**Success Criteria** (what must be TRUE):
  1. `CAST(object!, BBjString)` conveys `BBjString` type so that method completion works on the result
  2. Accessing a super class field via `#field!` shorthand does not produce a warning when the field exists on a parent class
  3. Implicit getter calls (e.g., `obj!.Name$`) correctly convey return type for downstream method chaining and completion
  4. A `DECLARE` statement placed anywhere in a method body (not just before first use) is recognized for type resolution
  5. A `USE` statement referencing a Java inner class (e.g., jSoup `Element`) does not crash the language server
  6. Type resolution warnings can be disabled via workspace setting for heavily dynamic codebases
**Plans**: 4 plans

Plans:
- [x] 25-01-PLAN.md -- CAST() and implicit getter type conveyance + CAST warning diagnostic (TYPE-01, TYPE-03)
- [x] 25-02-PLAN.md -- Super class field resolution with cycle-safe inheritance traversal + unresolvable super warning (TYPE-02)
- [x] 25-03-PLAN.md -- DECLARE method-scoped visibility, USE crash resistance + USE warning diagnostic (TYPE-04, STAB-01)
- [x] 25-04-PLAN.md -- Workspace setting to disable type resolution warnings

### Phase 26: CPU Stability
**Goal**: Investigate root causes of 100% CPU usage in multi-project workspaces and document findings with ranked mitigations
**Depends on**: Nothing (independent investigation, can run in parallel with other phases)
**Requirements**: STAB-02
**Success Criteria** (what must be TRUE):
  1. Opening a workspace with multiple BBj projects does not cause sustained 100% CPU usage
  2. The language server remains responsive (completion, diagnostics) in multi-project workspaces
**Plans**: 1 plan

Plans:
- [ ] 26-01-PLAN.md -- Investigate CPU hot paths: analyze rebuild pipeline, index invalidation, and 3 secondary hypotheses; produce FINDINGS.md

### Phase 27: IDE Polish
**Goal**: Structure View differentiates symbol kinds, run icons are scoped to BBj files, field completion triggers on `#`, and error messages include source filenames
**Depends on**: Nothing (independent fixes, can run in parallel with other phases)
**Requirements**: IDE-01, IDE-02, IDE-03, IDE-04, IDE-05
**Success Criteria** (what must be TRUE):
  1. Labels, variables, and fields show distinct icons/kinds in Structure View and completion popups (not all SymbolKind.Field)
  2. Run icons (GUI/BUI/DWC) appear only on BBj file types (.bbj, .bbl, .bbjt, .bbx, .src, .arc), not on all files
  3. Typing `#` inside a class triggers completion of the class's fields (global field completion)
  4. Cyclic reference and linker error messages include the source filename where the error originates
**Plans**: TBD

Plans:
- [ ] 27-01: TBD
- [ ] 27-02: TBD

## Progress

**Execution Order:** 24 -> 25 -> 26 -> 27 (26 and 27 are independent and could run in parallel after 25)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 24. Grammar & Parsing Fixes | v3.0 | 2/2 | Complete | 2026-02-06 |
| 25. Type Resolution & Crash Fixes | v3.0 | 4/4 | Complete | 2026-02-06 |
| 26. CPU Stability | v3.0 | 0/1 | Not started | - |
| 27. IDE Polish | v3.0 | 0/TBD | Not started | - |
