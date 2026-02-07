# Requirements: BBj Language Server v3.1

**Defined:** 2026-02-06
**Core Value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.

## v1 Requirements

Requirements for v3.1 PRIO 1+2 Issue Burndown. Each maps to a GitHub issue.

### Scoping & Variable Resolution

- [x] **SCOPE-01**: Variables only visible after declaration/initialization in program scope (#4)
- [ ] **SCOPE-02**: DEF FN parameters scoped correctly inside function expression/body (#226)
- [ ] **SCOPE-03**: Super class field access via `#field!` resolves through inheritance chain (#240)
- [x] **SCOPE-04**: DREAD recognizes variables already declared by DIM (array subscript form) (#247)
- [x] **SCOPE-05**: DECLARE type information applies to variable usage before the DECLARE statement (#265)

### Java Interop & Linking

- [ ] **JAVA-01**: Methods inherited from Java super classes resolve correctly when invoked via `#method()` or `#super!.method()` (#85)
- [ ] **JAVA-02**: Recently-added Java methods (e.g. setSlot()) found by reflection (#180)

### Parser & Validation

- [ ] **PARSE-01**: DEF FN inside class methods doesn't trigger line-break validation error (#226)
- [ ] **PARSE-02**: Cyclic reference error messages include source filename and line number (#245)

### File Type & IDE

- [ ] **IDE-01**: .bbx files treated as BBj programs (same icon, language handling, and run support as .bbj) (#340)

### Extension Settings

- [ ] **CONF-01**: config.bbx path and other BBj options configurable in extension settings (#244)
- [ ] **CONF-02**: Interop hostname and port configurable (not hardcoded to localhost:5008) (#257)
- [ ] **CONF-03**: EM access uses token-based auth instead of storing plaintext password (#256)

## Future Requirements

Deferred to later milestones. From remaining open issues.

### False Error Fixes (PRIO 3)

- **ERR-01**: Templated string variable names flagged as errors (#162)
- **ERR-02**: Variables flagged as errors in certain patterns (#164)
- **ERR-03**: Compound statement + RETURN inside function def (#183)
- **ERR-04**: Wrong cstNode data with colon newlines (#214)
- **ERR-05**: Various working programs generating false Problems (#295, #296)
- **ERR-06**: Remarks with unmatched quotes affect following lines (#297)
- **ERR-07**: methodend not recognized with multi-line UDF in method (#317)

### Feature Enhancements

- **FEAT-01**: IntelliSense triggered by dot character (#76)
- **FEAT-02**: Quick rename refactoring (#77)
- **FEAT-03**: Inlay hints (#108)
- **FEAT-04**: Project-wide USE statements (#83)
- **FEAT-05**: Validate CASE only inside SWITCH block (#206)

### Infrastructure

- **INFRA-01**: CPU stability mitigations (#232)
- **INFRA-02**: PREFIX scanning optimization (#32)
- **INFRA-03**: VSCode workspaces support (#33)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native IntelliJ parser rewrite | LSP4IJ approach works |
| Debugging support | Future milestone |
| BBj project wizard | Future milestone |
| Rename refactoring across files | Future milestone (#77) |
| CPU stability fix (#232) | Documented but deferred -- root cause known |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCOPE-01 | Phase 28 | Complete |
| SCOPE-02 | Phase 29 | Pending |
| SCOPE-03 | Phase 29 | Pending |
| SCOPE-04 | Phase 28 | Complete |
| SCOPE-05 | Phase 28 | Complete |
| JAVA-01 | Phase 29 | Pending |
| JAVA-02 | Phase 30 | Pending |
| PARSE-01 | Phase 29 | Pending |
| PARSE-02 | Phase 30 | Pending |
| IDE-01 | Phase 31 | Pending |
| CONF-01 | Phase 31 | Pending |
| CONF-02 | Phase 31 | Pending |
| CONF-03 | Phase 31 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-02-06*
*Last updated: 2026-02-06 after roadmap creation*
