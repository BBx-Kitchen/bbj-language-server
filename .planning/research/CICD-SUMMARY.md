# Research Summary: IntelliJ CI/CD Automation

**Project:** BBj Language Server — v2.2 IntelliJ Build & Release Automation
**Researched:** 2026-02-05
**Confidence:** HIGH

## Executive Summary

The research confirms that **unified versioning is fully achievable**. JetBrains Marketplace accepts the same `x.y.z` version format as VS Code. Both extensions can share the exact same version number sourced from `bbj-vscode/package.json`.

**Key findings:**

1. **Version compatibility confirmed:** JetBrains uses channels (EAP, default) instead of flags (--pre-release), but the version NUMBER format is identical. `x.y.0` = production, `x.y.z` (z>0) = preview works for both.

2. **Extend existing workflows:** Add IntelliJ build as dependent jobs in `preview.yml` and `manual-release.yml`. VS Code must build first (produces `main.cjs`), then IntelliJ consumes it.

3. **GitHub Releases for distribution:** Until Marketplace access, attach IntelliJ `.zip` to GitHub Releases created by the release workflow.

4. **Critical pitfall avoided:** Must use `gradle/actions/setup-gradle` (not archived `gradle/gradle-build-action` which has security vulnerability).

## Key Decisions Made by Research

| Question | Answer | Rationale |
|----------|--------|-----------|
| Same version numbers? | YES | JetBrains accepts x.y.z format |
| Version source of truth? | `bbj-vscode/package.json` | Already managed by preview.yml |
| Workflow structure? | Extend existing | Simpler artifact passing, single tag |
| IntelliJ distribution? | GitHub Releases | No Marketplace access yet |
| Marketplace publishing? | Deferred | First upload must be manual anyway |

## Stack Recommendations

| Component | Tool/Version | Notes |
|-----------|--------------|-------|
| Java | 17 (Temurin) | Already configured in project |
| Gradle actions | `gradle/actions/setup-gradle@v5` | NOT the archived gradle-build-action |
| Java setup | `actions/setup-java@v5` | With cache: 'gradle' |
| Release upload | `softprops/action-gh-release@v2` | Handles multiple assets |
| Version extraction | Groovy JsonSlurper | Built into Gradle, no deps needed |

## Architecture: Build Flow

```
push to main / manual trigger
        │
        v
┌───────────────────────────────────────┐
│  Job: build-vscode                    │
│  - npm ci && npm run build            │
│  - Produces main.cjs, grammars        │
│  - Upload artifacts                   │
│  - (preview: publish to VS Marketplace)│
└───────────────────────────────────────┘
        │ needs
        v
┌───────────────────────────────────────┐
│  Job: build-intellij                  │
│  - Download VS Code artifacts         │
│  - Read version from package.json     │
│  - ./gradlew buildPlugin              │
│  - Upload .zip artifact               │
└───────────────────────────────────────┘
        │ needs
        v
┌───────────────────────────────────────┐
│  Job: release (manual only)           │
│  - Download both artifacts            │
│  - Create GitHub Release              │
│  - Attach .vsix and .zip              │
└───────────────────────────────────────┘
```

## Critical Pitfalls to Address

| ID | Pitfall | Phase | Prevention |
|----|---------|-------|------------|
| P1 | Gradle action archived | 1 | Use `gradle/actions/setup-gradle@v5` |
| P4 | Version drift | 1 | Read IntelliJ version from package.json |
| P5 | JDK mismatch | 1 | Explicit `actions/setup-java@v5` with Java 17 |
| P15 | Build order | 1 | `needs: build-vscode` in workflow |
| P6 | gradlew permission | 1 | `chmod +x` or fix in git |

## Versioning Strategy

**Preview releases (push to main):**
1. VS Code bumps patch: `0.7.2` → `0.7.3`
2. IntelliJ reads same version from package.json
3. VS Code publishes with `--pre-release`
4. IntelliJ builds but doesn't publish (no Marketplace)
5. IntelliJ artifact available as workflow artifact (for testing)

**Production releases (manual trigger):**
1. Input version `0.8.0` (must end in .0)
2. Both extensions built with version `0.8.0`
3. VS Code publishes to Marketplace (no flag)
4. GitHub Release created with both artifacts

## Requirements Implied by Research

Based on research findings, the milestone requirements are:

**Infrastructure (Phase 1):**
- [ ] Modify `preview.yml` to add IntelliJ build job
- [ ] IntelliJ job reads version from package.json via JsonSlurper
- [ ] IntelliJ job depends on VS Code job (`needs:`)
- [ ] Upload IntelliJ artifact for download

**Release workflow (Phase 2):**
- [ ] Modify `manual-release.yml` to add IntelliJ build
- [ ] Create unified GitHub Release with both artifacts
- [ ] Both artifacts named with version: `bbj-intellij-{version}.zip`

**Validation (Phase 3):**
- [ ] Modify `build.yml` to validate IntelliJ builds on PRs
- [ ] Run `verifyPlugin` on release builds

## Out of Scope (Confirmed)

- JetBrains Marketplace publishing — requires manual first upload + token
- Plugin signing — only needed for Marketplace
- EAP channel configuration — only relevant when publishing to Marketplace
- Separate version tracks — research confirms alignment is possible

## Files Created

| File | Purpose |
|------|---------|
| `STACK.md` | Gradle tasks, GitHub Actions versions, version extraction |
| `INTELLIJ-VERSIONING.md` | JetBrains versioning compatibility analysis |
| `INTELLIJ-CICD-ARCHITECTURE.md` | Workflow structure, artifact handling |
| `PITFALLS-INTELLIJ-CICD.md` | 15 pitfalls with prevention strategies |

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Version compatibility | HIGH | Official JetBrains docs confirm |
| Workflow structure | HIGH | Standard GitHub Actions patterns |
| Gradle tasks | HIGH | Official plugin documentation |
| Pitfalls | HIGH | Verified against real issues |

---
*Research completed: 2026-02-05*
*Ready for requirements: YES*
