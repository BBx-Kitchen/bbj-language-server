# Roadmap: BBj Language Server

## Milestones

- v1.0 Internal Alpha - Phases 1-6 (shipped 2026-02-01)
- v1.1 Polish & Run Commands - Phases 7-10 (shipped 2026-02-02)
- v1.2 Run Fixes & Marketplace - Phases 11-13 (shipped 2026-02-02)
- v2.0 Langium 4 Upgrade - Phases 14-20 (shipped 2026-02-04)
- v2.1 Feature Gap Analysis - N/A (shipped 2026-02-04)
- v2.2 IntelliJ Build & Release Automation - Phases 21-23 (shipped 2026-02-05)
- v3.0 Improving BBj Language Support - Phases 24-27 (shipped 2026-02-06)
- v3.1 PRIO 1+2 Issue Burndown - Phases 28-31 (in progress)

## Phases

<details>
<summary>v1.0 through v3.0 (Phases 1-27) - SHIPPED</summary>

See .planning/MILESTONES.md for full history.

</details>

### v3.1 PRIO 1+2 Issue Burndown (In Progress)

**Milestone Goal:** Close all PRIO 1+2 GitHub issues -- fix variable scoping bugs, inheritance resolution, Java reflection staleness, and make extension settings configurable.

- [ ] **Phase 28: Variable Scoping & Declaration Order** - Variables respect declaration position and type annotations in program scope
- [ ] **Phase 29: DEF FN & Inheritance Resolution** - DEF FN works correctly in class methods; field/method access resolves through inheritance chains
- [ ] **Phase 30: Java Reflection & Error Reporting** - Java interop finds new methods; error messages include file and line info
- [ ] **Phase 31: Extension Settings & File Types** - .bbx file support; configurable paths, ports, and auth

## Phase Details

### Phase 28: Variable Scoping & Declaration Order
**Goal**: Program-scope variables respect declaration order, DIM-declared arrays are recognized by DREAD, and DECLARE type info propagates correctly
**Depends on**: Nothing (first phase of v3.1)
**Requirements**: SCOPE-01, SCOPE-04, SCOPE-05
**Success Criteria** (what must be TRUE):
  1. A variable used before its DIM/LET/assignment in program scope shows a "not declared" warning; the same variable used after its declaration resolves correctly
  2. A DREAD statement referencing a variable previously DIM'd as an array (subscript form) resolves without error
  3. A DECLARE statement anywhere in a method causes the declared type to apply to the variable throughout the entire method scope (not just after the DECLARE)
  4. Existing tests pass -- no regressions in class-scope or method-scope variable resolution
**Plans:** 2 plans
Plans:
- [ ] 28-01-PLAN.md -- Grammar auto property + use-before-assignment validation + conflicting DECLARE detection
- [ ] 28-02-PLAN.md -- Comprehensive test suite + edge case fixes

### Phase 29: DEF FN & Inheritance Resolution
**Goal**: DEF FN definitions inside class methods work without false errors and with correct parameter scoping; super class fields and inherited Java methods resolve through the inheritance chain
**Depends on**: Phase 28 (scoping infrastructure may be shared)
**Requirements**: SCOPE-02, SCOPE-03, PARSE-01, JAVA-01
**Success Criteria** (what must be TRUE):
  1. A DEF FN defined inside a class method does not produce a line-break validation error
  2. Parameters declared in a DEF FN expression are visible inside the FN body and do not leak into the enclosing method scope
  3. Accessing `#field!` where the field is defined in a super class (not the current class) resolves without a "field not found" warning
  4. Calling `#method()` or `#super!.method()` where the method is inherited from a Java super class resolves without a linking error
  5. Existing completion and go-to-definition features continue working for directly-declared fields and methods
**Plans**: TBD

### Phase 30: Java Reflection & Error Reporting
**Goal**: Java interop reflection finds recently-added methods; cyclic reference errors report the specific file and line number
**Depends on**: Phase 29 (Java interop changes build on inheritance work)
**Requirements**: JAVA-02, PARSE-02
**Success Criteria** (what must be TRUE):
  1. Methods added in recent BBj versions (e.g., `setSlot()` on BBjControl) are found by the Java interop reflection and appear in completion results
  2. Cyclic reference error messages in the Problems panel include the source filename and line number where the cycle was detected
  3. No regression in existing Java class/method completion for standard BBj API classes
**Plans**: TBD

### Phase 31: Extension Settings & File Types
**Goal**: .bbx files get full BBj treatment; BBj paths, interop connection, and EM auth are configurable in extension settings
**Depends on**: Nothing (independent of Phases 28-30; can run in parallel if needed)
**Requirements**: IDE-01, CONF-01, CONF-02, CONF-03
**Success Criteria** (what must be TRUE):
  1. Opening a .bbx file in VS Code shows the BBj icon, provides language intelligence (completion, diagnostics), and enables run commands -- same as .bbj files
  2. The extension settings include a field for config.bbx path and other BBj-specific options; changing these settings takes effect without restarting the extension
  3. The interop hostname and port are configurable in extension settings (not hardcoded to localhost:5008); connecting to a remote java-interop service works
  4. EM access uses token-based authentication; no plaintext passwords are stored in settings
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 28 -> 29 -> 30 -> 31

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 28. Variable Scoping & Declaration Order | 0/2 | Planned | - |
| 29. DEF FN & Inheritance Resolution | 0/TBD | Not started | - |
| 30. Java Reflection & Error Reporting | 0/TBD | Not started | - |
| 31. Extension Settings & File Types | 0/TBD | Not started | - |
