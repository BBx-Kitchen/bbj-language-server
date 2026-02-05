# Features Research: IntelliJ Versioning

**Domain:** JetBrains Marketplace versioning and release patterns
**Researched:** 2026-02-05
**Overall Confidence:** HIGH

## Executive Summary

JetBrains Marketplace uses semantic versioning (SemVer) and supports custom release channels for pre-release versions. The VS Code versioning scheme (x.y.0 = production, x.y.z where z>0 = preview) **CAN be used** with IntelliJ, but with important differences in how pre-releases are discovered by users.

**Key finding:** JetBrains uses **channels** (EAP, beta, alpha) rather than **flags** (--pre-release) for pre-release distribution. Users must explicitly add a custom repository URL to receive pre-release updates. This is fundamentally different from VS Code where users toggle a checkbox in the extension UI.

## JetBrains Marketplace Versioning

### Format Requirements

**Supported:** Standard semantic versioning (SemVer)
- `MAJOR.MINOR.PATCH` format (e.g., `0.1.0`, `1.2.3`)
- Pre-release tags supported (e.g., `1.0.0-beta`, `1.0.0-EAP`)
- Build metadata supported (e.g., `1.0.0+build123`)

**Validation:** JetBrains Marketplace validates versions against SemVer rules. When SemVer mode is enabled (default for new plugins), versions are compared to determine if plugin page metadata should be updated.

**Current sorting behavior:** As of research date, updates are sorted by upload timestamp, not version number. JetBrains plans to implement version-based sorting for SemVer-enabled plugins in the future.

**Source:** [JetBrains Marketplace SemVer Documentation](https://plugins.jetbrains.com/docs/marketplace/semver.html)

### Preview/Pre-release Support

JetBrains handles pre-releases through **custom release channels**, NOT through version flags.

| Aspect | VS Code | JetBrains |
|--------|---------|-----------|
| Mechanism | `--pre-release` flag | Custom channels (eap, beta, alpha) |
| User discovery | Toggle in extension UI | Must add repository URL manually |
| Version format | Same version, flag differentiates | Channel differentiates (can use same or different version) |
| Auto-update | Respects pre-release preference | Channel takes precedence over default |

**How custom channels work:**
1. Publisher configures channel in Gradle: `channels = listOf("eap")`
2. Plugin publishes to `https://plugins.jetbrains.com/plugins/eap/[pluginId]`
3. Users add that URL as a custom plugin repository in IDE settings
4. Users receive updates ONLY from that channel (not from stable)

**Critical behavior:** If a user subscribes to an EAP channel, they will NOT receive stable channel updates unless you also publish stable releases to the EAP channel.

**Source:** [Custom Release Channels Documentation](https://plugins.jetbrains.com/docs/marketplace/custom-release-channels.html)

### Update Channels

| Channel | Purpose | Repository URL Pattern |
|---------|---------|------------------------|
| default (stable) | Production releases | Built-in (no URL needed) |
| eap | Early Access Preview | `https://plugins.jetbrains.com/plugins/eap/list` |
| beta | Beta testing | `https://plugins.jetbrains.com/plugins/beta/list` |
| alpha | Alpha testing | `https://plugins.jetbrains.com/plugins/alpha/list` |
| [custom] | Any name you choose | `https://plugins.jetbrains.com/plugins/[custom]/list` |

**Gradle configuration (IntelliJ Platform Gradle Plugin 2.x):**
```kotlin
intellijPlatform {
    publishing {
        channels = listOf("eap")  // or "beta", "alpha", etc.
    }
}
```

**Source:** [Publishing a Plugin](https://plugins.jetbrains.com/docs/intellij/publishing-plugin.html)

### Version Comparison Rules

JetBrains follows standard SemVer precedence:
- `1.0.0` > `1.0.0-beta` > `1.0.0-alpha`
- `1.0.0-beta.2` > `1.0.0-beta.1`
- Pre-release versions are LOWER than release versions: `1.0.0-EAP` < `1.0.0`

**Important:** The stable version should be higher than EAP versions. For example, `1.0.0-EAP` is lower than `1.0.0`.

## VS Code Compatibility Assessment

### Current VS Code Scheme

From the existing workflows in this repository:

**Production releases (`manual-release.yml`):**
- Format: `x.y.0` (must end with `.0`)
- Published WITHOUT `--pre-release` flag
- Current version: `0.7.0` was the last release

**Preview releases (`preview.yml`):**
- Format: `x.y.z` where `z > 0`
- Published WITH `--pre-release` flag
- Auto-increments patch on each push to main
- Current version: `0.7.2` (preview)

**How it works in VS Code:**
- Users see "Install Pre-Release Version" option
- Pre-release users get `0.7.1`, `0.7.2`, etc.
- When `0.8.0` stable releases, pre-release users update to it
- Then `0.8.1`, `0.8.2` continue as previews

### Can IntelliJ Use Same Scheme?

**YES** - The version NUMBER format is fully compatible.

JetBrains Marketplace accepts `0.7.0`, `0.7.1`, `0.7.2` etc. The x.y.z format is valid SemVer.

**HOWEVER** - The version SEMANTICS differ.

| What | VS Code | JetBrains |
|------|---------|-----------|
| `0.7.0` visible to | All users (stable) | All users (stable channel) |
| `0.7.1` visible to | Pre-release opted-in users | EAP channel subscribers only |
| How user opts in | Toggle in UI | Add custom repository URL |
| Discovery | Automatic in Marketplace | Manual URL entry required |

### Alignment Strategy

**Recommended approach: Aligned version numbers with channel-based distribution**

Both VS Code and IntelliJ can use IDENTICAL version numbers:
- `x.y.0` = Production release (VS Code stable, JetBrains default channel)
- `x.y.z` (z>0) = Preview release (VS Code pre-release, JetBrains EAP channel)

**Implementation:**

1. **Version source:** Single source of truth (package.json or shared version file)

2. **VS Code workflow (existing):**
   ```bash
   # Preview
   vsce publish --pre-release

   # Stable
   vsce publish
   ```

3. **IntelliJ workflow (new):**
   ```kotlin
   intellijPlatform {
       publishing {
           // Determine channel from version
           val version = project.version.toString()
           val isPreview = version.split('.').last() != "0"
           channels = if (isPreview) listOf("eap") else listOf("default")
       }
   }
   ```

4. **Gradle version detection pattern:**
   ```kotlin
   // In build.gradle.kts
   val versionString = project.version.toString()
   val patchVersion = versionString.split('.').getOrNull(2)?.toIntOrNull() ?: 0
   val isPreviewRelease = patchVersion > 0

   intellijPlatform {
       publishing {
           channels = if (isPreviewRelease) listOf("eap") else emptyList()
       }
   }
   ```

### Alternative: Separate Version Tracks

If aligned versions prove problematic, an alternative is separate versioning:

| Release Type | VS Code | IntelliJ |
|--------------|---------|----------|
| Preview | `0.7.1`, `0.7.2` | `0.7.1-eap`, `0.7.2-eap` |
| Stable | `0.8.0` | `0.8.0` |

**Pros:** Clearer distinction, follows JetBrains convention
**Cons:** Version numbers don't match exactly, more complex to manage

## Recommendation

**Use aligned version numbers (x.y.0 stable, x.y.z preview) for both marketplaces.**

**Rationale:**
1. Simpler to maintain - one version number, two publishing targets
2. Both marketplaces accept the format
3. Clear semantic meaning (patch > 0 = preview)
4. Matches existing VS Code workflow

**Implementation notes:**

1. **User experience differs:** JetBrains EAP users must manually add a repository URL. Consider documenting this clearly.

2. **Stable releases must go to BOTH channels:** When releasing `0.8.0` (stable), publish to both default AND eap channels so EAP subscribers receive the update.

3. **Channel detection in CI:**
   ```yaml
   - name: Determine channel
     run: |
       VERSION=$(grep 'version' build.gradle.kts | grep -oP '\d+\.\d+\.\d+')
       PATCH=$(echo $VERSION | cut -d. -f3)
       if [ "$PATCH" = "0" ]; then
         echo "CHANNEL=default" >> $GITHUB_ENV
       else
         echo "CHANNEL=eap" >> $GITHUB_ENV
       fi
   ```

4. **Documentation needed:**
   - README: How to install EAP version (add repository URL)
   - Changelog: Clearly mark preview vs stable releases

## Quality Gate Checklist

- [x] JetBrains Marketplace version format documented - SemVer required, x.y.z fully supported
- [x] Preview/pre-release support confirmed - Via custom channels (EAP, beta, alpha), NOT flags
- [x] Compatibility assessment provided - YES, same version numbers work; channel mechanism differs
- [x] Recommendation made - Align versions; use channels for distribution

## Sources

**HIGH confidence (official documentation):**
- [JetBrains Marketplace SemVer Documentation](https://plugins.jetbrains.com/docs/marketplace/semver.html)
- [Custom Release Channels Documentation](https://plugins.jetbrains.com/docs/marketplace/custom-release-channels.html)
- [Publishing a Plugin](https://plugins.jetbrains.com/docs/intellij/publishing-plugin.html)
- [Plugin Configuration File](https://plugins.jetbrains.com/docs/intellij/plugin-configuration-file.html)
- [VS Code Publishing Extension](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

**MEDIUM confidence (community/support):**
- [How Do I Publish To An EAP Channel?](https://intellij-support.jetbrains.com/hc/en-us/community/posts/360009478380-How-Do-I-Publish-To-An-EAP-Channel-)
- [EAP channel for plugins](https://intellij-support.jetbrains.com/hc/en-us/community/posts/115000113284-EAP-channel-for-plugins)
