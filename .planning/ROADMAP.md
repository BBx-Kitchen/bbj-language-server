# Roadmap: BBj Language Server

## Milestones

- v1.0 Internal Alpha - Phases 1-6 (shipped 2026-02-01)
- v1.1 Polish & Run Commands - Phases 7-10 (shipped 2026-02-02)
- v1.2 Run Fixes & Marketplace - Phases 11-13 (shipped 2026-02-02)
- v2.0 Langium 4 Upgrade - Phases 14-20 (shipped 2026-02-04)
- v2.1 Feature Gap Analysis - N/A (research milestone, shipped 2026-02-04)
- **v2.2 IntelliJ Build & Release Automation** - Phases 21-23 (in progress)

## v2.2 IntelliJ Build & Release Automation

**Milestone Goal:** Unified CI/CD automation for both VS Code and IntelliJ extensions. Preview builds on every push to main, manual production releases with GitHub Release artifacts.

## Phases

- [ ] **Phase 21: Preview Workflow** - IntelliJ builds automatically on push to main with version parity
- [ ] **Phase 22: Release Workflow** - Manual release builds both extensions and creates GitHub Release
- [ ] **Phase 23: PR Validation** - IntelliJ builds validated on pull requests

## Phase Details

### Phase 21: Preview Workflow
**Goal**: IntelliJ plugin builds automatically on every push to main, synchronized with VS Code builds
**Depends on**: Nothing (first phase of milestone)
**Requirements**: PREV-01, PREV-02, PREV-03, PREV-04
**Success Criteria** (what must be TRUE):
  1. Push to main triggers IntelliJ plugin build (in addition to existing VS Code build)
  2. IntelliJ plugin version matches VS Code version from package.json
  3. IntelliJ build waits for VS Code build to complete (consumes main.cjs artifact)
  4. IntelliJ .zip artifact is downloadable from workflow run
**Plans**: TBD

Plans:
- [ ] 21-01: TBD

### Phase 22: Release Workflow
**Goal**: Manual release trigger produces both extensions with matching versions and creates GitHub Release
**Depends on**: Phase 21
**Requirements**: RELS-01, RELS-02, RELS-03, RELS-04
**Success Criteria** (what must be TRUE):
  1. Manual workflow dispatch builds both VS Code and IntelliJ extensions
  2. Input version (x.y.0) applied to both extensions identically
  3. GitHub Release created with .vsix and .zip attached
  4. Release notes include IntelliJ installation instructions
**Plans**: TBD

Plans:
- [ ] 22-01: TBD

### Phase 23: PR Validation
**Goal**: Pull requests that affect IntelliJ plugin are validated before merge
**Depends on**: Phase 22
**Requirements**: PRVAL-01, PRVAL-02
**Success Criteria** (what must be TRUE):
  1. PRs touching bbj-intellij/ trigger IntelliJ build validation
  2. Plugin verifier runs on release workflow builds (catches compatibility issues)
**Plans**: TBD

Plans:
- [ ] 23-01: TBD

## Progress

**Execution Order:** 21 -> 22 -> 23

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 21. Preview Workflow | v2.2 | 0/? | Not started | - |
| 22. Release Workflow | v2.2 | 0/? | Not started | - |
| 23. PR Validation | v2.2 | 0/? | Not started | - |

---
*Roadmap created: 2026-02-05*
*Milestone: v2.2 IntelliJ Build & Release Automation*
