# Requirements: BBj Language Server v3.2

**Defined:** 2026-02-07
**Core Value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.

## v3.2 Requirements

### Regressions

- [x] **REG-01**: BBjAPI() resolves correctly — no "Could not resolve reference to NamedElement named 'BBjAPI'" error, completion works on variables assigned from BBjAPI()
- [x] **REG-02**: Ctrl-click on class name in USE statement navigates to class definition via PREFIX path (#357)

### Parser/Lexer Bugs

- [x] **PARSE-01**: `void` keyword in method signature not flagged as unresolvable class (#356)
- [x] **PARSE-02**: `mode$` and other `$`-suffixed variables inside DEF FN within class methods don't produce lexer errors (#355)
- [x] **PARSE-03**: `select` statement with `from`/`where` clauses parses without false line-break errors (#295)
- [x] **PARSE-04**: `cast(BBjString[],...)` — array type notation `[]` in CAST expression parses correctly (#296)

### Polish

- [x] **POL-01**: VS Code settings labels show "BBj" (not "Bbj") for product name (#315)
- [x] **POL-02**: Unresolvable file path in USE statement flagged as error on the file name portion (#172)

## Future Requirements

Deferred to later milestones.

### Feature Gaps (from Dynamo analysis)

- **GAP-01**: Called program completion (`call "` trigger)
- **GAP-02**: Data Dictionary field completion
- **GAP-04**: BBjTemplatedString getter/setter completion
- **GAP-05**: Chained method return type resolution
- **GAP-08**: External documentation links in hover
- **GAP-09**: Reopen as BBj command
- **GAP-11**: Deprecated method visual indicator

### Untagged Bugs

- **#183**: Compound statement + RETURN in DEF FN
- **#214**: Wrong cstNode with colon newlines
- **#269**: Inconsistent hash sign coloring
- **#112**: Remove # and ! from word separators
- **#173**: Flag unresolvable RUN/CALL filenames
- **#206**: Validate CASE only inside SWITCH

## Out of Scope

| Feature | Reason |
|---------|--------|
| CPU stability mitigations (#232) | Documented but requires deep Langium changes; separate milestone |
| Data Dictionary integration | Requires external service or Dynamo Tools format; separate milestone |
| Debugging support | Future milestone |
| Refactoring (rename across files) | Future milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REG-01 | Phase 32 | Complete |
| REG-02 | Phase 32 | Complete |
| PARSE-01 | Phase 33 | Complete |
| PARSE-02 | Phase 33 | Complete |
| PARSE-03 | Phase 33 | Complete |
| PARSE-04 | Phase 33 | Complete |
| POL-01 | Phase 34 | Complete |
| POL-02 | Phase 34 | Complete |

**Coverage:**
- v3.2 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 after roadmap creation*
