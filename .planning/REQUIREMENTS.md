# Requirements: BBj Language Server v2.2

**Defined:** 2026-02-05
**Core Value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.

## v2.2 Requirements

Requirements for IntelliJ Build & Release Automation milestone.

### Preview Automation

- [x] **PREV-01**: On push to main, IntelliJ plugin builds automatically ✓
- [x] **PREV-02**: IntelliJ version matches VS Code version from package.json ✓
- [x] **PREV-03**: IntelliJ build depends on VS Code build (uses main.cjs) ✓
- [x] **PREV-04**: IntelliJ .zip available as workflow artifact ✓

### Release Automation

- [ ] **RELS-01**: Manual release trigger builds both extensions
- [ ] **RELS-02**: Both extensions use input version (x.y.0 format)
- [ ] **RELS-03**: GitHub Release created with both .vsix and .zip
- [ ] **RELS-04**: Release includes installation instructions for IntelliJ

### PR Validation

- [ ] **PRVAL-01**: IntelliJ builds validated on PRs affecting bbj-intellij/
- [ ] **PRVAL-02**: Plugin verifier runs on release builds

## Future Requirements

Deferred to later milestones.

### Marketplace Publishing

- **MKTPL-01**: Plugin signed with JetBrains certificate
- **MKTPL-02**: Automated publishing to JetBrains Marketplace on release
- **MKTPL-03**: EAP channel publishing for preview releases

## Out of Scope

| Feature | Reason |
|---------|--------|
| JetBrains Marketplace publishing | No access yet; first upload must be manual |
| Plugin signing | Only required for Marketplace |
| Separate version tracks | Research confirms unified versioning works |
| EAP channel configuration | Only relevant when publishing to Marketplace |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PREV-01 | Phase 21 | Complete |
| PREV-02 | Phase 21 | Complete |
| PREV-03 | Phase 21 | Complete |
| PREV-04 | Phase 21 | Complete |
| RELS-01 | Phase 22 | Pending |
| RELS-02 | Phase 22 | Pending |
| RELS-03 | Phase 22 | Pending |
| RELS-04 | Phase 22 | Pending |
| PRVAL-01 | Phase 23 | Pending |
| PRVAL-02 | Phase 23 | Pending |

**Coverage:**
- v2.2 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-05*
*Last updated: 2026-02-05 - Phase 21 requirements complete*
