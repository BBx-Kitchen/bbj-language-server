# Requirements: BBj Language Server

**Defined:** 2026-02-08
**Core Value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.

## v3.4 Requirements

Requirements for 0.8.0 issue closure. Each maps to roadmap phases.

### Parser

- [ ] **PARSE-01**: Field names starting with `step` (e.g. `stepXYZ!`) parse correctly in class definitions (#368)

### File Types

- [ ] **FTYP-01**: `.bbl` files excluded from BBj source code file type registration (#369)

### Toolbar

- [ ] **TOOL-01**: Decompile toolbar button removed entirely (#370)
- [ ] **TOOL-02**: Compile toolbar button has a proper icon (#370)
- [ ] **TOOL-03**: Compile button only visible when a BBj file is in the editor (#370, #354)

### Run Commands

- [ ] **RUN-01**: Token-based EM authentication works end-to-end for BUI/DWC launch (#256, #359)
- [ ] **RUN-02**: BUI/DWC launch completes without repeated login prompts (#359)
- [ ] **RUN-03**: Run commands use configured config.bbx path from settings (#244)

## Future Requirements

None deferred — all 0.8.0 issues in scope.

## Out of Scope

| Feature | Reason |
|---------|--------|
| CPU stability mitigations (#232) | High-risk change, not appropriate for final milestone today |
| Feature gap implementation (v2.1) | New features, not issue closure |
| Dead code cleanup | Not an issue — defer to future |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PARSE-01 | Phase 40 | Pending |
| FTYP-01 | Phase 41 | Pending |
| TOOL-01 | Phase 42 | Pending |
| TOOL-02 | Phase 42 | Pending |
| TOOL-03 | Phase 42 | Pending |
| RUN-01 | Phase 43 | Pending |
| RUN-02 | Phase 43 | Pending |
| RUN-03 | Phase 43 | Pending |

**Coverage:**
- v3.4 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0
- Coverage: 100%

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-08 after roadmap creation*
