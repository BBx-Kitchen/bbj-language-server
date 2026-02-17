---
phase: quick-14
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .github/workflows/manual-release.yml
autonomous: true
must_haves:
  truths:
    - "verifyPlugin runs with the correct release version, not the default 0.1.0"
    - "publishPlugin publishes the plugin with the correct release version, not the default 0.1.0"
    - "create-release job has git repository context so gh CLI can create the release"
  artifacts:
    - path: ".github/workflows/manual-release.yml"
      provides: "Fixed manual release workflow"
      contains: "publishPlugin.*-Pversion"
  key_links:
    - from: "build-vscode job outputs.version"
      to: "build-intellij verifyPlugin and publishPlugin commands"
      via: "needs.build-vscode.outputs.version gradle property"
      pattern: "-Pversion=\\$\\{\\{ needs\\.build-vscode\\.outputs\\.version \\}\\}"
    - from: "create-release job"
      to: "actions/checkout@v4"
      via: "checkout step before gh release create"
      pattern: "uses: actions/checkout@v4"
---

<objective>
Fix two bugs in the manual release GitHub Actions workflow that cause the IntelliJ plugin to be published with the wrong version (0.1.0 instead of the release version) and the GitHub Release creation to fail (gh CLI needs git repo context).

Purpose: Ensure the manual release workflow correctly versions the IntelliJ plugin and creates GitHub Releases without errors.
Output: Fixed `.github/workflows/manual-release.yml`
</objective>

<execution_context>
@/Users/beff/.claude/get-shit-done/workflows/execute-plan.md
@/Users/beff/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.github/workflows/manual-release.yml
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix version passing and add checkout to manual release workflow</name>
  <files>.github/workflows/manual-release.yml</files>
  <action>
In the `build-intellij` job:

1. Line 132 — `verifyPlugin` step: Change the run command from:
   `./gradlew verifyPlugin`
   to:
   `./gradlew verifyPlugin -Pversion=${{ needs.build-vscode.outputs.version }}`
   This ensures the plugin verification runs against the correctly-versioned artifact.

2. Line 136 — `publishPlugin` step: Change the run command from:
   `./gradlew publishPlugin -PintellijPlatformPublishingToken=${{ secrets.JETBRAINS_MARKETPLACE_TOKEN }}`
   to:
   `./gradlew publishPlugin -Pversion=${{ needs.build-vscode.outputs.version }} -PintellijPlatformPublishingToken=${{ secrets.JETBRAINS_MARKETPLACE_TOKEN }}`
   This ensures the published plugin carries the correct release version instead of the default 0.1.0 from build.gradle.kts.

In the `create-release` job:

3. Add `actions/checkout@v4` as the FIRST step (before the download-artifact steps, at line 151). This provides the git repository context that `gh release create` requires to function:
   ```yaml
   - uses: actions/checkout@v4
   ```
  </action>
  <verify>
Verify all three fixes are present in the file:

1. `grep 'verifyPlugin -Pversion' .github/workflows/manual-release.yml` — should match
2. `grep 'publishPlugin -Pversion' .github/workflows/manual-release.yml` — should match
3. Confirm create-release job has checkout step by checking that `actions/checkout@v4` appears in the create-release job section (third occurrence of checkout in the file)
  </verify>
  <done>
- verifyPlugin command includes `-Pversion=${{ needs.build-vscode.outputs.version }}`
- publishPlugin command includes `-Pversion=${{ needs.build-vscode.outputs.version }}`
- create-release job has `actions/checkout@v4` as its first step before artifact downloads
  </done>
</task>

</tasks>

<verification>
- Workflow YAML is valid (no syntax errors)
- `verifyPlugin` and `publishPlugin` both receive `-Pversion` with the version from build-vscode outputs
- `create-release` job checks out the repository before running `gh release create`
- No other changes to the workflow (no unintended modifications)
</verification>

<success_criteria>
All three bugs fixed in a single commit. The manual release workflow will correctly version the IntelliJ plugin and successfully create GitHub Releases.
</success_criteria>

<output>
After completion, create `.planning/quick/14-fix-manual-release-workflow-pass-version/14-SUMMARY.md`
</output>
