# Phase 22: Release Workflow - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Manual workflow dispatch that builds both VS Code and IntelliJ extensions, publishes VS Code to Marketplace, and creates a GitHub Release with both artifacts attached. Extends existing `manual-release.yml` which already handles version validation, package.json update, commit, tag, and Marketplace publishing.

</domain>

<decisions>
## Implementation Decisions

### Trigger & inputs
- Use existing `manual-release.yml` workflow — don't reinvent version validation
- Keep existing workflow_dispatch with version input (validates x.y.0 format, must be greater than current)
- Continue publishing VS Code extension to Marketplace as part of release
- Restrict releases to main branch only

### Release content
- Release title: version only (e.g., "v25.12.0")
- Auto-generate changelog from commits since last tag
- Include full IntelliJ installation instructions (step-by-step: download ZIP, Settings > Plugins > Install from disk)

### Artifact naming
- VS Code .vsix: keep existing naming (vsce generates automatically)
- IntelliJ .zip: include version in filename (e.g., bbj-intellij-25.12.0.zip)

### Claude's Discretion
- Build order (sequential vs parallel) — pick based on efficiency vs simplicity
- Whether GitHub Release is separate job or part of last build job
- Error handling if Marketplace publish fails — pick reasonable approach

</decisions>

<specifics>
## Specific Ideas

- Existing manual-release.yml already validates version format (x.y.0), ensures version is greater than current, updates package.json, commits, tags, and publishes to Marketplace
- IntelliJ build can reuse main.cjs artifact sharing pattern from preview workflow (Phase 21)
- Step-by-step IntelliJ instructions should cover: download ZIP from release, open IntelliJ, Settings > Plugins > gear icon > Install Plugin from Disk

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-release-workflow*
*Context gathered: 2026-02-05*
