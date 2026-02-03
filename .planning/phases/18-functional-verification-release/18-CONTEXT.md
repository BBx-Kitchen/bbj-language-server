# Phase 18: Functional Verification & Release - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify every existing language server feature works identically in both VS Code and IntelliJ after the Langium 4 upgrade, then build release artifacts. This phase does NOT publish -- user handles versioning and publishing separately. If regressions are found, they route back to Phase 17 as gaps.

</domain>

<decisions>
## Implementation Decisions

### Verification approach
- Automated where possible: write automated tests for features that can be tested programmatically
- Explicitly verify the 7 Chevrotain "unreachable" tokens (EXTRACT, DELETE, INPUT, ENTER, SAVE, READ, FIND) work at runtime -- add specific test cases proving they parse correctly
- Claude picks appropriate test fixtures from the repo
- IntelliJ: build artifact verification only -- user will test runtime behavior manually
- Claude's Discretion on verification depth per feature (quick vs deep based on complexity)

### Version numbering
- User handles ALL version bumps separately -- Claude skips versioning entirely
- No version changes in package.json, build.gradle.kts, or any manifest files

### Release process
- Skip publishing entirely -- user handles vsce publish and JetBrains marketplace
- Build VS Code .vsix package (vsce package) as packaging verification
- Build IntelliJ .jar (Gradle buildPlugin) as packaging verification
- Artifacts built but not published

### Regression handling
- Zero tolerance for regressions -- every feature must work exactly as before
- If a feature doesn't work: route back to Phase 17 as gaps (don't fix in Phase 18)
- Phase 18 is verification and artifact building only, not fixing

### Claude's Discretion
- Test fixture selection from repo
- Verification depth per feature
- Mix of automated vs manual verification per feature
- How to structure automated verification tests

</decisions>

<specifics>
## Specific Ideas

- The 7 Chevrotain false-positive tokens must be explicitly verified with runtime test cases (flagged by Phase 17 verifier)
- IntelliJ runtime testing is manual -- Claude only builds the artifact
- This phase should produce a clear pass/fail report for each of the 9 features

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 18-functional-verification-release*
*Context gathered: 2026-02-03*
