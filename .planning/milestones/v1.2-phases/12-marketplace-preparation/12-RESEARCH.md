# Phase 12: Marketplace Preparation - Research

**Researched:** 2026-02-02
**Domain:** JetBrains Marketplace publishing process
**Confidence:** HIGH

## Summary

JetBrains Marketplace plugin submission requires compliance with specific technical requirements and approval guidelines. The process involves preparing icon assets, configuring plugin.xml metadata, including license files in the distribution, and passing the Plugin Verifier with zero errors. This research focused on the IntelliJ Platform Gradle Plugin 2.x tooling, marketplace approval criteria, and packaging standards established by JetBrains.

The standard approach uses Gradle tasks provided by the IntelliJ Platform Gradle Plugin (2.x): `verifyPlugin` for binary compatibility checking, `signPlugin` for cryptographic signing, and `buildPlugin` for creating the distribution ZIP. Icon assets must be SVG format at 40x40px placed in META-INF/, plugin.xml must contain description and change-notes in CDATA-wrapped HTML, and LICENSE files must be included in the plugin distribution.

User decisions from CONTEXT.md constrain this phase: use the VS Code extension's icon (convert from PNG to SVG), match the VS Code Marketplace listing tone, include MIT License with BASIS International Ltd. as copyright holder, and target version 0.1.0 with IntelliJ 2024.1+ compatibility.

**Primary recommendation:** Use IntelliJ Platform Gradle Plugin 2.x built-in tasks for all marketplace preparation steps; configure `pluginVerification.ides` to test against multiple 2024.x versions; convert VS Code PNG icon to SVG manually; generate NOTICES file documenting LSP4IJ (EPL-2.0) and TextMate bundle dependencies.

## Standard Stack

The established tools for JetBrains plugin marketplace preparation:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| IntelliJ Platform Gradle Plugin | 2.x (2.10.5+) | Plugin build, verification, signing, publishing | Official JetBrains tooling, replaces deprecated 1.x plugin |
| Plugin Verifier CLI | Latest (via Gradle) | Binary compatibility checking across IDE versions | Mandatory for Marketplace approval, catches API violations |
| Marketplace ZIP Signer | Latest (via Gradle) | Cryptographic signing of plugin distributions | Required by JetBrains Marketplace, prevents tampering |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Gradle License Report Plugin | 2.x | Generate third-party license reports | When documenting bundled dependencies for NOTICES file |
| ImageMagick/Inkscape | Latest | Convert PNG to SVG for plugin icons | When icon source is raster format (like VS Code extension) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Gradle Plugin 2.x | Manual Plugin Verifier CLI | Gradle integration provides caching, IDE resolution, reporting; manual CLI requires scripting |
| SVG icons | PNG icons | Marketplace requires SVG; PNG will be rejected during approval |
| Automated NOTICES | Manual dependency listing | Automated tools miss bundled resources like TextMate bundles, manual ensures completeness |

**Installation:**
```bash
# Plugin build.gradle.kts already includes:
dependencies {
    intellijPlatform {
        pluginVerifier()  # Adds Plugin Verifier CLI
        zipSigner()       # Adds Marketplace ZIP Signer
    }
}
```

## Architecture Patterns

### Recommended File Structure
```
bbj-intellij/
├── src/main/resources/META-INF/
│   ├── plugin.xml                # Core metadata (already exists)
│   ├── description.html          # Marketplace listing description (already exists)
│   ├── pluginIcon.svg            # Light theme icon 40x40 (exists, verify compliance)
│   ├── pluginIcon_dark.svg       # Dark theme icon 40x40 (exists, verify compliance)
│   ├── LICENSE                   # MIT License text for distribution
│   └── NOTICES                   # Third-party dependency attributions
└── build.gradle.kts              # Gradle configuration with verification settings
```

### Pattern 1: Icon Conversion Workflow
**What:** Convert VS Code PNG icon to SVG while maintaining 40x40 visible design area with 2px transparent padding.
**When to use:** Icon source is raster format (PNG/JPG) from another platform.
**Process:**
1. Download PNG from VS Code Marketplace CDN (100x113 confirmed)
2. Convert to SVG using vector tracing (Inkscape or online converter)
3. Resize canvas to 40x40 viewBox, center design within 36x36 area
4. Create dark variant if needed (examine existing pluginIcon_dark.svg)
5. Validate SVG file size under 3KB (JetBrains recommendation)

**Source:** [Plugin Icon File | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/plugin-icon-file.html)

### Pattern 2: Plugin.xml Configuration via Gradle
**What:** Use `intellijPlatform.pluginConfiguration` extension to set metadata that gets patched into plugin.xml.
**When to use:** Always - separates build-time values from static XML.
**Example:**
```kotlin
// Source: https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-extension.html
intellijPlatform {
    pluginConfiguration {
        name = "BBj Language Support"
        version = "0.1.0"

        vendor {
            name = "BASIS International Ltd."
            email = "support@basis.cloud"
            url = "https://basis.cloud"
        }

        description = file("src/main/resources/META-INF/description.html").readText()

        changeNotes = """
            <![CDATA[
            <h3>0.1.0 - Initial Release</h3>
            <ul>
              <li>Syntax highlighting for BBj files</li>
              <li>Real-time diagnostics and error checking</li>
              <li>Code completion for BBj keywords and Java classes</li>
              <li>Go-to-definition and hover documentation</li>
              <li>Signature help for method calls</li>
              <li>Run commands for GUI, BUI, and DWC programs</li>
            </ul>
            ]]>
        """.trimIndent()

        ideaVersion {
            sinceBuild = "242"  // IntelliJ 2024.2
            untilBuild = provider { "" }  // Open-ended compatibility
        }
    }
}
```

### Pattern 3: Plugin Verifier Configuration
**What:** Configure IDE versions to test against and failure thresholds.
**When to use:** Always - Marketplace requires zero errors for approval.
**Example:**
```kotlin
// Source: https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-extension.html
intellijPlatform {
    pluginVerification {
        ides {
            // Test against multiple 2024.x versions
            create(IntelliJPlatformType.IntellijIdeaCommunity, "2024.1")
            create(IntelliJPlatformType.IntellijIdeaCommunity, "2024.2")
            create(IntelliJPlatformType.IntellijIdeaCommunity, "2024.3")

            // Or use recommended() to auto-select based on sinceBuild/untilBuild
            recommended()
        }

        failureLevel = listOf(
            FailureLevel.COMPATIBILITY_PROBLEMS,  // Fail on binary incompatibilities
            FailureLevel.INVALID_PLUGIN           // Fail on structural issues
        )

        // Exclude classes from "no such class" warnings if using dynamic loading
        // externalPrefixes = listOf("com.external.optional")
    }
}
```

### Pattern 4: NOTICES File Structure
**What:** Document all bundled third-party dependencies with license information.
**When to use:** Plugin bundles libraries or resources (LSP4IJ, TextMate bundles).
**Structure:**
```text
BBj Language Support for IntelliJ IDEA
Copyright 2023 BASIS International Ltd.

This product includes software developed by third parties:

================================================================================
LSP4IJ - Language Server Protocol Client for IntelliJ
Copyright Red Hat, Inc.
License: Eclipse Public License 2.0 (EPL-2.0)
Source: https://github.com/redhat-developer/lsp4ij
================================================================================

TextMate Bundle (bbj.tmLanguage.json, bbx.tmLanguage.json)
Copyright 2023 BASIS International Ltd.
License: MIT License
Source: https://github.com/BBx-Kitchen/bbj-language-server
================================================================================

[Additional bundled dependencies...]
```

**Source:** [OSPOCO: Practice Tip: Licenses, Dependencies, and NOTICE Files](https://ospo.co/blog/practice-tip-licenses-dependencies-and-notice-files/)

### Anti-Patterns to Avoid
- **PNG icons in META-INF:** JetBrains Marketplace requires SVG format; PNG icons cause rejection
- **Missing CDATA wrappers in plugin.xml:** HTML in `<description>` and `<change-notes>` must be wrapped in `<![CDATA[...]]>` or XML parsing fails
- **Incomplete vendor information:** Email and URL are optional in plugin.xml but required by Marketplace submission form
- **Version in plugin name:** Don't include "v0.1" or version numbers in plugin name; Marketplace displays version separately
- **Bundled dependencies without attribution:** Including libraries like LSP4IJ without NOTICES file violates EPL-2.0 requirements

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Binary compatibility checking | Custom reflection-based API scanner | Plugin Verifier via `verifyPlugin` task | Verifier knows internal API annotations (@ApiStatus.Internal), deprecated methods, version-specific availability; custom scanner will miss edge cases |
| Plugin signing | Manual ZIP manipulation with Java crypto | Marketplace ZIP Signer via `zipSigner()` dependency | JetBrains uses AWS KMS signing; manual signing won't be accepted by Marketplace without proper certificate chain |
| Icon format conversion | Manual SVG generation from PNG pixels | Vector tracing tools (Inkscape, online converters) | Hand-coding SVG paths from raster images produces massive file sizes and poor curves; tracing algorithms optimize for small file size |
| Third-party license aggregation | Manually reading JAR MANIFEST.MF files | Gradle License Report Plugin or similar | Transitive dependencies, version changes, and POM parsing are error-prone; automated tools detect all bundled licenses |
| IDE version resolution | Hardcoding download URLs for IDE binaries | `intellijPlatform.pluginVerification.ides` DSL | JetBrains changes CDN URLs, version numbering; Gradle plugin handles resolution, caching, platform-specific builds |

**Key insight:** JetBrains Marketplace has strict automated checks during upload (plugin structure validation, signature verification) followed by manual review (icon uniqueness, description quality). Tools provided by IntelliJ Platform Gradle Plugin are designed to pass these checks; custom solutions often fail on edge cases discovered only during Marketplace upload.

## Common Pitfalls

### Pitfall 1: Plugin Verifier Warnings Treated as Acceptable
**What goes wrong:** Developer sees warnings (not errors) from Plugin Verifier and assumes plugin can be submitted, but Marketplace reviewer rejects for quality concerns.
**Why it happens:** Verifier defaults to `failureLevel = COMPATIBILITY_PROBLEMS` which only fails on errors; warnings about experimental API usage or deprecated methods don't fail the build.
**How to avoid:** Review all warnings before submission; fix experimental API usage by checking if stable alternatives exist in IntelliJ Platform docs.
**Warning signs:** Verifier output contains "Experimental API usage", "Deprecated API usage", "Internal API usage" lines but task succeeds.

### Pitfall 2: Icon SVG with Embedded Raster Data
**What goes wrong:** Developer converts PNG to SVG using simple embedding (data URI), resulting in 40KB+ SVG file that's rejected for size or poor scaling.
**Why it happens:** Some conversion tools embed the PNG as base64 data inside `<image>` tag rather than tracing to vector paths.
**How to avoid:** Use vector tracing (Inkscape "Trace Bitmap" or online tools with tracing), verify SVG contains `<path>` elements not `<image>`, check file size under 3KB.
**Warning signs:** SVG file larger than 10KB, opening in text editor shows `data:image/png;base64` strings.

### Pitfall 3: Missing Since-Build Compatibility
**What goes wrong:** Plugin.xml specifies `since-build="242"` (IntelliJ 2024.2) but Plugin Verifier tests against 2024.1, causing "plugin doesn't support this IDE version" errors.
**Why it happens:** Mismatch between `ideaVersion.sinceBuild` in Gradle config and IDE versions in `pluginVerification.ides`.
**How to avoid:** Ensure all IDE versions in `pluginVerification.ides.create()` match or exceed `sinceBuild` value; use `recommended()` for automatic alignment.
**Warning signs:** Verifier output shows "Plugin is incompatible with build XYZ" for versions you expected to support.

### Pitfall 4: Description HTML with Unsupported Tags
**What goes wrong:** Plugin description includes `<script>`, `<style>`, or complex HTML that JetBrains Marketplace strips, breaking formatting.
**Why it happens:** Developer copies HTML from website assuming full HTML5 support; Marketplace only allows basic formatting tags.
**How to avoid:** Stick to `<p>`, `<ul>`, `<li>`, `<strong>`, `<em>`, `<a>` tags; test description by viewing in IDE Settings > Plugins page.
**Warning signs:** Description looks broken in local IDE plugin manager preview.

### Pitfall 5: License File Not in Distribution
**What goes wrong:** LICENSE file exists in repository root but isn't included in plugin ZIP; Marketplace rejects for missing license.
**Why it happens:** Gradle doesn't automatically copy root-level files to plugin distribution; LICENSE must be in `src/main/resources/META-INF/`.
**How to avoid:** Place LICENSE in `src/main/resources/META-INF/` or use Gradle task to copy during build; verify by extracting built ZIP and checking contents.
**Warning signs:** `./gradlew buildPlugin` produces ZIP without LICENSE in extracted contents.

### Pitfall 6: Change Notes Reference Future Plans
**What goes wrong:** Initial release change notes say "Coming soon: feature X" or "Planned features"; Marketplace rejects for listing unreleased features.
**Why it happens:** Developer treats change notes like roadmap; Marketplace expects only completed changes.
**How to avoid:** For version 0.1.0, list only implemented features as bullet points; save future plans for GitHub README or separate roadmap.
**Warning signs:** Change notes contain words "planned", "upcoming", "will add", "future".

## Code Examples

Verified patterns from official sources:

### Gradle Configuration for Marketplace Preparation
```kotlin
// Source: https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-extension.html
plugins {
    id("org.jetbrains.intellij.platform") version "2.10.5"
}

dependencies {
    intellijPlatform {
        pluginVerifier()
        zipSigner()
        instrumentationTools()
    }
}

intellijPlatform {
    pluginConfiguration {
        name = "BBj Language Support"
        version = "0.1.0"

        vendor {
            name = "BASIS International Ltd."
            email = "support@basis.cloud"
            url = "https://basis.cloud"
        }

        description = file("src/main/resources/META-INF/description.html").readText()

        changeNotes = """
            <![CDATA[
            <h3>0.1.0 - Initial Release</h3>
            <ul>
              <li>Syntax highlighting for BBj and BBx config files</li>
              <li>Real-time diagnostics powered by Langium language server</li>
              <li>Code completion for BBj keywords and Java classes</li>
              <li>Go-to-definition and hover documentation</li>
              <li>Signature help for method calls</li>
              <li>Run commands for GUI, BUI, and DWC programs</li>
              <li>Java interop intelligence for BASIS.BBjAPI classes</li>
            </ul>
            ]]>
        """.trimIndent()

        ideaVersion {
            sinceBuild = "242"
            untilBuild = provider { "" }
        }
    }

    pluginVerification {
        ides {
            recommended()
        }
        failureLevel = listOf(
            FailureLevel.COMPATIBILITY_PROBLEMS,
            FailureLevel.INVALID_PLUGIN
        )
    }

    signing {
        // Configure when ready to publish
        // certificateChain = file("chain.crt").readText()
        // privateKey = file("private.pem").readText()
        // password = System.getenv("SIGNING_PASSWORD")
    }
}

tasks {
    verifyPlugin {
        // Add --list-ides flag to see which IDEs will be tested
    }

    buildPlugin {
        // Ensure LICENSE is included
        from("src/main/resources/META-INF") {
            include("LICENSE", "NOTICES")
        }
    }
}
```

### Running Verification Before Submission
```bash
# Source: https://plugins.jetbrains.com/docs/intellij/verifying-plugin-compatibility.html

# List IDE versions that will be verified
./gradlew verifyPlugin --list-ides

# Run verification (fails on compatibility problems)
./gradlew verifyPlugin

# Check verification reports
cat build/reports/pluginVerifier/verifyPlugin-*/verification-result.txt

# Build final distribution ZIP
./gradlew buildPlugin

# Verify ZIP contents include LICENSE and NOTICES
unzip -l bbj-intellij/build/distributions/BBj-Language-Support-0.1.0.zip
```

### Description HTML Format
```html
<!-- Source: https://plugins.jetbrains.com/docs/marketplace/best-practices-for-listing.html -->
<p>
BBj Language Support brings comprehensive IDE features for BBj development to IntelliJ IDEA.
Powered by the same Langium-based language server as the VS Code extension.
</p>

<p><strong>Features:</strong></p>
<ul>
  <li>Syntax highlighting with TextMate grammars</li>
  <li>Real-time error diagnostics</li>
  <li>Code completion for BBj keywords and Java classes</li>
  <li>Go-to-definition and hover documentation</li>
  <li>Signature help for method calls</li>
  <li>Java interop intelligence for BASIS.BBjAPI classes</li>
  <li>Run commands for GUI, BUI, and DWC programs</li>
</ul>

<p><strong>Requirements:</strong></p>
<ul>
  <li>Node.js 18+ (for language server)</li>
  <li>BBj installation (optional, for enhanced features)</li>
</ul>

<p>
<a href="https://github.com/BBx-Kitchen/bbj-language-server">GitHub Repository</a> |
<a href="https://BBx-Kitchen.github.io/bbj-language-server/">Documentation</a>
</p>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Gradle IntelliJ Plugin 1.x | IntelliJ Platform Gradle Plugin 2.x | July 2024 (v2.0 release) | New plugin uses provider-based APIs, improved dependency resolution, better IDE version management; 1.x deprecated but still works |
| Manual Plugin Verifier download | `pluginVerifier()` dependency | 2.x plugin introduction | Gradle handles CLI tool download, versioning, caching; no manual setup |
| PNG plugin icons | SVG plugin icons (mandatory) | ~2020 (gradual enforcement) | SVG ensures sharp rendering at all scales, smaller file sizes; marketplace now rejects PNG |
| Hardcoded plugin.xml values | `patchPluginXml` task from Gradle | 1.x plugin era (~2019) | Build-time values (version, description) managed in Gradle, reducing duplication |
| Manual signing with Java keytool | Marketplace ZIP Signer integration | ~2021 (marketplace security update) | JetBrains double-signs plugins (author + marketplace); integrated tooling required |

**Deprecated/outdated:**
- **Gradle IntelliJ Plugin 1.x (`org.jetbrains.intellij`):** Still works but no longer actively developed; migrate to 2.x for new projects
- **`runPluginVerifier` task name:** Renamed to `verifyPlugin` in 2.x plugin; old name doesn't exist
- **Plugin icons as PNG:** Marketplace approval guidelines require SVG; PNG icons auto-rejected during upload
- **`intellij { }` extension block:** Replaced with `intellijPlatform { }` in 2.x plugin

## Open Questions

Things that couldn't be fully resolved:

1. **Exact icon conversion quality requirements**
   - What we know: JetBrains requires SVG, recommends under 3KB file size, 40x40 viewBox with 2px padding
   - What's unclear: Acceptable level of detail loss during PNG-to-SVG tracing; whether simplified paths affect approval
   - Recommendation: Convert VS Code PNG to SVG using Inkscape tracing, compare visually against original at 40x40 and 80x80 scales, simplify paths if file exceeds 3KB but maintain recognizability

2. **Plugin Verifier IDE version coverage**
   - What we know: sinceBuild="242" targets IntelliJ 2024.2+, `recommended()` selects matching IDE versions automatically
   - What's unclear: Whether Marketplace reviewers test against versions beyond what verifyPlugin tests; whether untilBuild="" (open-ended) requires testing against EAP builds
   - Recommendation: Use `recommended()` for initial submission; if reviewer requests additional version testing, add specific versions to `ides { }` block

3. **NOTICES file completeness**
   - What we know: LSP4IJ uses EPL-2.0 (must be documented), TextMate bundles are own work (MIT), plugin depends on bundled Node.js language server
   - What's unclear: Whether Gradle-managed dependencies (not bundled) need NOTICES entries; whether language server's npm dependencies (bundled in main.cjs) require listing
   - Recommendation: Start with LSP4IJ and TextMate bundles only; if Marketplace reviewer requests more detail, inspect main.cjs bundle and list significant dependencies (Langium, Chevrotain)

4. **Change notes length limits**
   - What we know: change-notes supports HTML formatting, displays in Marketplace and IDE update dialogs
   - What's unclear: Maximum character count before truncation; whether long change notes affect approval
   - Recommendation: Keep initial release notes under 500 characters (6-8 bullet points); detailed features belong in plugin description, not change notes

## Sources

### Primary (HIGH confidence)
- [Plugin Icon File | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/plugin-icon-file.html) - Icon size, format, location requirements
- [Verifying Plugin Compatibility | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/verifying-plugin-compatibility.html) - Plugin Verifier usage, compatibility checking
- [IntelliJ Platform Extension | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-extension.html) - pluginConfiguration and pluginVerification DSL
- [Plugin Configuration File | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/plugin-configuration-file.html) - plugin.xml structure, required fields
- [JetBrains Marketplace Approval Guidelines](https://plugins.jetbrains.com/docs/marketplace/jetbrains-marketplace-approval-guidelines.html) - Approval criteria, rejection reasons
- [Best practices for listing | JetBrains Marketplace](https://plugins.jetbrains.com/docs/marketplace/best-practices-for-listing.html) - Description, change notes, screenshot guidelines
- [Uploading a new plugin | JetBrains Marketplace](https://plugins.jetbrains.com/docs/marketplace/uploading-a-new-plugin.html) - Upload process, required fields

### Secondary (MEDIUM confidence)
- [LSP4IJ GitHub Repository](https://github.com/redhat-developer/lsp4ij) - EPL-2.0 license confirmed for NOTICES file
- [VS Code BBj Extension Marketplace](https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang) - Feature list, description reference
- [OSPOCO: Practice Tip: Licenses, Dependencies, and NOTICE Files](https://ospo.co/blog/practice-tip-licenses-dependencies-and-notice-files/) - NOTICES file structure best practices
- [Gradle License Report Plugin](https://github.com/jk1/Gradle-License-Report) - Third-party dependency documentation automation

### Tertiary (LOW confidence)
- WebSearch: "IntelliJ plugin verifier common errors warnings how to fix 2026" - Community patterns for fixing verifier issues (needs official docs validation)
- WebSearch: "JetBrains plugin signing certificate Marketplace ZIP Signer 2026" - Signing process overview (official docs found afterward for verification)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - IntelliJ Platform Gradle Plugin 2.x is official tooling, well-documented with recent 2.10.5 release
- Architecture patterns: HIGH - All patterns sourced from official IntelliJ Platform Plugin SDK with direct URLs
- Pitfalls: MEDIUM - Derived from official docs warnings plus web search for community experiences; common pitfalls verified against SDK docs
- Icon conversion: MEDIUM - Official requirements clear (SVG, 40x40, 2px padding) but specific PNG-to-SVG tracing quality not documented

**Research date:** 2026-02-02
**Valid until:** 2026-04-02 (60 days - JetBrains Marketplace requirements stable, but Gradle plugin updates frequently)
