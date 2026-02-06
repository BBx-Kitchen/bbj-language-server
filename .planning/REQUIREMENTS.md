# Requirements: BBj Language Server

**Defined:** 2026-02-06
**Core Value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.

## v3.0 Requirements

Requirements for v3.0 — Improving BBj Language Support. Each maps to roadmap phases.

### Grammar & Parsing

- [x] **GRAM-01**: `endif`/`swend` followed by `;rem` comment on same line no longer flagged as error (#318)
- [x] **GRAM-02**: Camel-case method names containing BBj keywords parsed correctly as single identifiers (#316)
- [x] **GRAM-03**: DREAD verb and DATA statement supported by grammar (#247)
- [x] **GRAM-04**: DEF FN / FNEND inside class methods parsed without error (#226)
- [x] **GRAM-05**: Comment after colon line-continuation (`: REM`) parsed without error (#118)

### Type Resolution & Scoping

- [ ] **TYPE-01**: CAST() correctly conveys type for downstream method resolution and completion (#352)
- [ ] **TYPE-02**: Super class field access via `#field!` shorthand not flagged as warning (#240)
- [ ] **TYPE-03**: Implicit getter correctly conveys return type for method chaining and completion (#241)
- [ ] **TYPE-04**: DECLARE recognized anywhere in scope, not just before first use (#265)

### Crash & Stability

- [ ] **STAB-01**: LS handles inner/nested Java classes in USE statements without crashing (#314)
- [ ] **STAB-02**: Multi-project workspaces no longer cause 100% CPU (#232)

### IDE Features & Convenience

- [ ] **IDE-01**: Labels, variables, and fields have distinct SymbolKind in Structure View and completion (#353)
- [ ] **IDE-02**: Run icons only appear on BBj file types, not all files (#354)
- [ ] **IDE-03**: Run icons support .bbx, .src, .arc file extensions (#340)
- [ ] **IDE-04**: Global field `#` triggers completion of class fields (gap analysis)
- [ ] **IDE-05**: Cyclic reference and linker error messages include source filename (#245)

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Grammar Completeness

- **GRAM-F01**: Compound statement with RETURN inside function def (#183)
- **GRAM-F02**: Multi-line user-defined function inside method (#317)
- **GRAM-F03**: Wrong cstNode data when using colon newlines (#214)
- **GRAM-F04**: Validate CASE only inside SWITCH block (#206)

### Type Resolution

- **TYPE-F01**: Chained method resolution — `BBjAPI().getConfig().method()` (gap analysis)
- **TYPE-F02**: Linking error when invoking method from Java super class (#85)
- **TYPE-F03**: Validate object constructor argument count (#87)
- **TYPE-F04**: Validate interfaces cannot be instantiated (#86)

### Code Completion

- **COMP-F01**: Called program completion from CALL/RUN (#173, gap analysis)
- **COMP-F02**: Data Dictionary field completion (gap analysis)
- **COMP-F03**: BBjTemplatedString getter/setter completion (gap analysis)
- **COMP-F04**: Systematically verify and implement functions (#179)

### Infrastructure & Polish

- **INFR-F01**: Configurable interop hostname/port (#257)
- **INFR-F02**: EM token instead of plaintext password (#256)
- **INFR-F03**: Configurable output level / log filtering (#158)
- **INFR-F04**: Configurable config.bbx and BBj options (#244)
- **INFR-F05**: Remove # and ! from word separators (#112)
- **INFR-F06**: Inlay hints for function parameters (#108)
- **INFR-F07**: Error recovery / fault tolerance (#105)
- **INFR-F08**: Flag unresolvable filenames in RUN/CALL (#173)
- **INFR-F09**: Flag unresolvable filenames in USE statements (#172)
- **INFR-F10**: Project-wide USE statements from config.bbx (#83)
- **INFR-F11**: Skip linking for encrypted files (#90)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native IntelliJ parser/lexer rewrite | LSP4IJ approach reuses existing LS |
| Debugging support | Separate future milestone |
| BBj project wizard/templates | Separate future milestone |
| Company Library / metadata completions | Requires external metadata infrastructure (Dynamo Tools territory) |
| Syntax color customization (#110) | VS Code TextMate scoping — user can customize via settings |
| Custom classpath/command line for run (#231) | Nice-to-have, defer |
| REM with unmatched quotes color bleed (#297) | TextMate grammar issue, cosmetic |
| "Bbj" capitalization in settings (#315) | Cosmetic, low impact |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| GRAM-01 | Phase 24 | Complete |
| GRAM-02 | Phase 24 | Complete |
| GRAM-03 | Phase 24 | Complete |
| GRAM-04 | Phase 24 | Complete |
| GRAM-05 | Phase 24 | Complete |
| TYPE-01 | Phase 25 | Pending |
| TYPE-02 | Phase 25 | Pending |
| TYPE-03 | Phase 25 | Pending |
| TYPE-04 | Phase 25 | Pending |
| STAB-01 | Phase 25 | Pending |
| STAB-02 | Phase 26 | Pending |
| IDE-01 | Phase 27 | Pending |
| IDE-02 | Phase 27 | Pending |
| IDE-03 | Phase 27 | Pending |
| IDE-04 | Phase 27 | Pending |
| IDE-05 | Phase 27 | Pending |

**Coverage:**
- v3.0 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-02-06*
*Last updated: 2026-02-06 after roadmap creation*
