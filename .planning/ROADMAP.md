# Roadmap: BBj Language Server

## Milestones

- ✅ **v1.0 Internal Alpha** — Phases 1-6 (shipped 2026-02-01)
- ✅ **v1.1 Polish & Run Commands** — Phases 7-10 (shipped 2026-02-02)
- ✅ **v1.2 Run Fixes & Marketplace** — Phases 11-13 (shipped 2026-02-02)
- ✅ **v2.0 Langium 4 Upgrade** — Phases 14-20 (shipped 2026-02-04)
- ✅ **v2.1 Feature Gap Analysis** — Research only (shipped 2026-02-04)
- ✅ **v2.2 IntelliJ Build & Release Automation** — Phases 21-23 (shipped 2026-02-05)
- ✅ **v3.0 Improving BBj Language Support** — Phases 24-27 (shipped 2026-02-06)
- ✅ **v3.1 PRIO 1+2 Issue Burndown** — Phases 28-31 (shipped 2026-02-07)
- ✅ **v3.2 Bug Fix Release** — Phases 32-34 (shipped 2026-02-08)
- ✅ **v3.3 Output & Diagnostic Cleanup** — Phases 35-39 (shipped 2026-02-08)
- 🚧 **v3.4 0.8.0 Issue Closure** — Phases 40-43 (in progress)

## Phases

<details>
<summary>✅ v1.0 Internal Alpha (Phases 1-6) — SHIPPED 2026-02-01</summary>

- [x] Phase 1: Plugin Scaffolding (3/3 plans)
- [x] Phase 2: Syntax Highlighting (2/2 plans)
- [x] Phase 3: Settings & Runtime (3/3 plans)
- [x] Phase 4: Language Server Integration (5/5 plans)
- [x] Phase 5: Java Interop (3/3 plans)
- [x] Phase 6: Distribution (3/3 plans)

</details>

<details>
<summary>✅ v1.1 Polish & Run Commands (Phases 7-10) — SHIPPED 2026-02-02</summary>

- [x] Phase 7: Brand Icons (1/1 plan)
- [x] Phase 8: Run Commands (2/2 plans)
- [x] Phase 9: Structure View (1/1 plan)
- [x] Phase 10: Bug Fixes & Polish (2/2 plans)

</details>

<details>
<summary>✅ v1.2 Run Fixes & Marketplace (Phases 11-13) — SHIPPED 2026-02-02</summary>

- [x] Phase 11: Run Command Fixes (2/2 plans)
- [x] Phase 12: Marketplace Preparation (2/2 plans)
- [x] Phase 13: Plugin ID Fix (1/1 plan)

</details>

<details>
<summary>✅ v2.0 Langium 4 Upgrade (Phases 14-20) — SHIPPED 2026-02-04</summary>

- [x] Phase 14: Deps & Grammar (1/1 plan)
- [x] Phase 15: Core API Renames & Type Constants (2/2 plans)
- [x] Phase 16: API Signature & Deprecated API Migration (2/2 plans)
- [x] Phase 17: Build Verification & Test Suite (2/2 plans)
- [x] Phase 18: Functional Verification & Release (2/2 plans)
- [x] Phase 19: Test Plan (1/1 plan)
- [x] Phase 20: Human QA Testing (1/1 plan)

</details>

<details>
<summary>✅ v2.1 Feature Gap Analysis — SHIPPED 2026-02-04</summary>

Research-only milestone — no phases.

</details>

<details>
<summary>✅ v2.2 IntelliJ Build & Release Automation (Phases 21-23) — SHIPPED 2026-02-05</summary>

- [x] Phase 21: Preview Workflow (1/1 plan)
- [x] Phase 22: Release Workflow (1/1 plan)
- [x] Phase 23: PR Validation (1/1 plan)

</details>

<details>
<summary>✅ v3.0 Improving BBj Language Support (Phases 24-27) — SHIPPED 2026-02-06</summary>

- [x] Phase 24: Grammar & Parsing Fixes (3/3 plans)
- [x] Phase 25: Type Resolution & Crash Fixes (3/3 plans)
- [x] Phase 26: CPU Stability (2/2 plans)
- [x] Phase 27: IDE Polish (3/3 plans)

</details>

<details>
<summary>✅ v3.1 PRIO 1+2 Issue Burndown (Phases 28-31) — SHIPPED 2026-02-07</summary>

- [x] Phase 28: Variable Scoping & Declaration Order (4/4 plans)
- [x] Phase 29: DEF FN & Inheritance Resolution (3/3 plans)
- [x] Phase 30: Java Reflection & Error Reporting (3/3 plans)
- [x] Phase 31: Extension Settings & File Types (3/3 plans)

</details>

<details>
<summary>✅ v3.2 Bug Fix Release (Phases 32-34) — SHIPPED 2026-02-08</summary>

- [x] Phase 32: Regression Fixes (4/4 plans)
- [x] Phase 33: Parser & Lexer Fixes (4/4 plans)
- [x] Phase 34: Diagnostic Polish (2/2 plans)

</details>

<details>
<summary>✅ v3.3 Output & Diagnostic Cleanup (Phases 35-39) — SHIPPED 2026-02-08</summary>

- [x] Phase 35: Logger Infrastructure (1/1 plan)
- [x] Phase 36: Settings Plumbing (1/1 plan)
- [x] Phase 37: Console Migration (2/2 plans)
- [x] Phase 38: Diagnostic Filtering (1/1 plan)
- [x] Phase 39: Parser Diagnostics (1/1 plan)

</details>

### 🚧 v3.4 0.8.0 Issue Closure (In Progress)

**Milestone Goal:** Close all open GitHub issues tagged with the 0.8.0 milestone — low-risk fixes only.

- [x] **Phase 40: Parser Fix** - Fix `step` keyword breaking structure parsing (2026-02-08)
- [ ] **Phase 41: File Type Fix** - Remove .bbl from BBj source file extensions
- [ ] **Phase 42: Toolbar Button Polish** - Fix Compile/Decompile toolbar buttons
- [ ] **Phase 43: Run Command Fixes** - Fix BUI/DWC login loop and config.bbx path

### Phase 40: Parser Fix
**Goal**: Field names starting with `step` parse correctly in class definitions
**Depends on**: Nothing (first phase of milestone)
**Requirements**: PARSE-01
**Success Criteria** (what must be TRUE):
  1. Class field declarations like `stepXYZ!` parse without error
  2. Structure view shows fields starting with `step` at correct nesting level
  3. No false parsing errors on valid BBj class definitions containing `step*` field names
**Plans**: 1 plan

Plans:
- [x] 40-01-PLAN.md — Verify STEP LONGER_ALT and add test coverage

### Phase 41: File Type Fix
**Goal**: `.bbl` files excluded from BBj source code language features
**Depends on**: Phase 40
**Requirements**: FTYP-01
**Success Criteria** (what must be TRUE):
  1. `.bbl` files do not trigger BBj language server features (diagnostics, completion)
  2. `.bbl` files still recognized by IDE but treated as plain text
  3. `.bbj`, `.bbx`, `.src` files continue working as BBj source files
**Plans**: 1 plan

Plans:
- [ ] 41-01-PLAN.md — Remove .bbl from VS Code and IntelliJ file type registrations

### Phase 42: Toolbar Button Polish
**Goal**: Compile/Decompile toolbar buttons behave correctly in IntelliJ
**Depends on**: Phase 41
**Requirements**: TOOL-01, TOOL-02, TOOL-03
**Success Criteria** (what must be TRUE):
  1. Decompile toolbar button completely removed from IntelliJ UI
  2. Compile button displays with a proper icon (not default placeholder)
  3. Compile button only appears when a BBj file is open in the editor
  4. Compile button hidden when non-BBj files are active
**Plans**: TBD

Plans:
- [ ] 42-01: TBD

### Phase 43: Run Command Fixes
**Goal**: BUI/DWC run commands work reliably with proper authentication
**Depends on**: Phase 42
**Requirements**: RUN-01, RUN-02, RUN-03
**Success Criteria** (what must be TRUE):
  1. Token-based EM authentication works end-to-end for BUI/DWC launch
  2. BUI/DWC launch completes without repeated login prompts
  3. Run commands use configured config.bbx path from extension settings
  4. Token authentication flow documented as closed in issue #256
**Plans**: TBD

Plans:
- [ ] 43-01: TBD

## Progress

| Phase Range | Milestone | Plans | Status | Shipped |
|-------------|-----------|-------|--------|---------|
| 1-6 | v1.0 Internal Alpha | 19 | ✓ Complete | 2026-02-01 |
| 7-10 | v1.1 Polish & Run Commands | 6 | ✓ Complete | 2026-02-02 |
| 11-13 | v1.2 Run Fixes & Marketplace | 5 | ✓ Complete | 2026-02-02 |
| 14-20 | v2.0 Langium 4 Upgrade | 11 | ✓ Complete | 2026-02-04 |
| N/A | v2.1 Feature Gap Analysis | N/A | ✓ Complete | 2026-02-04 |
| 21-23 | v2.2 IntelliJ Build & Release | 3 | ✓ Complete | 2026-02-05 |
| 24-27 | v3.0 BBj Language Support | 11 | ✓ Complete | 2026-02-06 |
| 28-31 | v3.1 PRIO 1+2 Burndown | 13 | ✓ Complete | 2026-02-07 |
| 32-34 | v3.2 Bug Fix Release | 10 | ✓ Complete | 2026-02-08 |
| 35-39 | v3.3 Output & Diagnostic Cleanup | 6 | ✓ Complete | 2026-02-08 |
| 40-43 | v3.4 0.8.0 Issue Closure | TBD | In progress | - |

**Total:** 11 milestones shipped (11), 43 phases (39 complete), 105 plans shipped in 8 days

---

*Roadmap last updated: 2026-02-08 after Phase 41 planning*
