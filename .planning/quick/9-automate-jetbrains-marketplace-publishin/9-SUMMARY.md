# Quick Task 9: Automate JetBrains Marketplace Publishing

**One-liner:** Added automated JetBrains Marketplace publishing to the manual release workflow

## Changes

### build.gradle.kts
- Added `publishing { token = providers.gradleProperty("intellijPlatformPublishingToken") }` block to the `intellijPlatform` configuration

### manual-release.yml
- Added `Publish to JetBrains Marketplace` step after `verifyPlugin` in the `build-intellij` job
- Passes `JETBRAINS_MARKETPLACE_TOKEN` secret as Gradle property
- Updated release notes to mention JetBrains Marketplace with direct link

## Setup Required

To enable this, add the following GitHub Actions secret:

1. Go to https://plugins.jetbrains.com/author/me/tokens
2. Click "Generate Token" and give it a name (e.g. "GitHub Actions")
3. Copy the token
4. Go to repo Settings > Secrets and variables > Actions
5. Add secret: `JETBRAINS_MARKETPLACE_TOKEN` with the copied token value

## Notes

- JetBrains performs human review on plugin submissions, so the plugin won't appear on the marketplace immediately after publishing
- The ZIP is still uploaded to GitHub Releases as a fallback for users who want immediate access
- Publishing only happens on manual releases (x.y.0) — preview releases are not published to JetBrains Marketplace

## Commit
- 576198d: feat(ci): automate JetBrains Marketplace publishing in manual release
