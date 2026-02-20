# Phase 2: Syntax Highlighting - Research

**Researched:** 2026-02-01
**Domain:** IntelliJ TextMate grammar integration, syntax highlighting, color scheme customization
**Confidence:** HIGH

## Summary

This phase integrates the existing BBj TextMate grammar from `bbj-vscode/` into the IntelliJ plugin using IntelliJ's built-in `TextMateBundleProvider` extension point. The grammar files (`bbj.tmLanguage.json`, `bbx.tmLanguage.json`) and language configuration files (`bbj-language-configuration.json`, `bbx-language-configuration.json`) already exist in the VS Code extension and are the single source of truth.

The recommended approach is to use the `com.intellij.textmate.bundleProvider` extension point, which allows plugins to programmatically register TextMate bundles. This is a well-supported mechanism (bundled TextMate plugin is always enabled in IntelliJ Community and Ultimate). A Gradle copy task copies the grammar and language-configuration files from `bbj-vscode/` into the IntelliJ plugin's resources at compile time, keeping them always in sync. The TextMate plugin automatically maps standard scope names (like `keyword.control`, `string.quoted`, `comment.line`) to IntelliJ's `DefaultLanguageHighlighterColors`, so syntax highlighting colors work with any IntelliJ theme out of the box.

A critical finding is that registering a custom `FileType` (as done in Phase 1) can conflict with TextMate bundle highlighting -- the custom FileType's default empty highlighter overrides the TextMate bundle's highlighting. The fix is to explicitly register `TextMateSyntaxHighlighterFactory` for the BBj language in `plugin.xml`, bridging the custom FileType to the TextMate grammar engine.

**Primary recommendation:** Use `TextMateBundleProvider` extension point with a Gradle copy task to sync grammar files from bbj-vscode, and explicitly register `TextMateSyntaxHighlighterFactory` for the BBj language to avoid FileType/TextMate conflict.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| IntelliJ TextMate Bundles Plugin | Bundled (no version) | TextMate grammar engine for syntax highlighting | Built into IntelliJ Community & Ultimate, always enabled, provides the `TextMateBundleProvider` extension point |
| IntelliJ Platform SDK | 2024.2 (build 242) | Plugin development framework | Already established in Phase 1 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| IntelliJ Platform Gradle Plugin | 2.11.0 | Build system, dependency management | Already established; add `bundledPlugin("org.jetbrains.plugins.textmate")` for TextMate dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TextMateBundleProvider | Custom SyntaxHighlighter + Lexer (Grammar-Kit) | Full control but massive effort -- requires hand-translating entire grammar to JFlex/BNF. TextMate reuse is the right call for this project. |
| TextMateBundleProvider | LSP4IJ TextMate support | LSP4IJ does NOT have its own TextMate registration mechanism -- it relies on IntelliJ's built-in TextMate plugin. No advantage over direct TextMateBundleProvider. |

**Gradle dependency addition:**
```kotlin
dependencies {
    intellijPlatform {
        intellijIdeaCommunity("2024.2")
        bundledPlugin("org.jetbrains.plugins.textmate")  // NEW
        pluginVerifier()
        zipSigner()
        instrumentationTools()
    }
}
```

## Architecture Patterns

### Recommended Project Structure
```
bbj-intellij/
  src/main/
    java/com/basis/bbj/intellij/
      BbjLanguage.java              # (Phase 1 - exists)
      BbjFileType.java              # (Phase 1 - exists)
      BbjIcons.java                 # (Phase 1 - exists)
      BbjTextMateBundleProvider.java # NEW - TextMate bundle registration
    resources/
      META-INF/plugin.xml           # Updated with TextMate deps & extensions
      textmate/bbj-bundle/          # NEW - Copied grammar files (build artifact)
        package.json                #   VS Code-format bundle descriptor
        syntaxes/
          bbj.tmLanguage.json       #   BBj grammar
          bbx.tmLanguage.json       #   BBx grammar
        bbj-language-configuration.json  # Bracket matching, comments
        bbx-language-configuration.json  # BBx bracket matching, comments
```

### Pattern 1: TextMateBundleProvider Implementation
**What:** A Java class implementing `TextMateBundleProvider` that tells IntelliJ where to find bundled TextMate grammar files.
**When to use:** Always -- this is the mechanism for registering TextMate bundles from a plugin.
**Example:**
```java
// Source: https://github.com/JetBrains/intellij-community/blob/master/plugins/textmate/src/org/jetbrains/plugins/textmate/api/TextMateBundleProvider.kt
// Verified against Bruno IDE Extensions PR #11: https://github.com/usebruno/bruno-ide-extensions/pull/11
package com.basis.bbj.intellij;

import org.jetbrains.plugins.textmate.api.TextMateBundleProvider;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Objects;
import com.intellij.openapi.application.PathManager;
import org.jetbrains.annotations.NotNull;

public class BbjTextMateBundleProvider implements TextMateBundleProvider {
    @NotNull
    @Override
    public List<PluginBundle> getBundles() {
        try {
            Path bundleTmpDir = Files.createTempDirectory(
                Path.of(PathManager.getTempPath()), "textmate-bbj");

            for (String fileToCopy : List.of(
                    "package.json",
                    "bbj-language-configuration.json",
                    "bbx-language-configuration.json",
                    "syntaxes/bbj.tmLanguage.json",
                    "syntaxes/bbx.tmLanguage.json")) {
                URL resource = BbjTextMateBundleProvider.class
                    .getClassLoader()
                    .getResource("textmate/bbj-bundle/" + fileToCopy);
                try (InputStream stream = Objects.requireNonNull(resource).openStream()) {
                    Path target = bundleTmpDir.resolve(fileToCopy);
                    Files.createDirectories(target.getParent());
                    Files.copy(stream, target);
                }
            }

            return List.of(new PluginBundle("BBj", bundleTmpDir));
        } catch (IOException e) {
            throw new RuntimeException("Failed to extract BBj TextMate bundle", e);
        }
    }
}
```

### Pattern 2: Gradle Copy Task for Grammar Sync
**What:** A Gradle task that copies grammar files from `bbj-vscode/` into the plugin's resources directory at compile time.
**When to use:** Always -- ensures grammar is always in sync with the VS Code extension.
**Example:**
```kotlin
// In build.gradle.kts
val copyTextMateBundle by tasks.registering(Copy::class) {
    from("${rootProject.projectDir}/../bbj-vscode/") {
        include("syntaxes/bbj.tmLanguage.json")
        include("syntaxes/bbx.tmLanguage.json")
        include("bbj-language-configuration.json")
        include("bbx-language-configuration.json")
    }
    into(layout.buildDirectory.dir("resources/main/textmate/bbj-bundle"))
}

tasks.named("processResources") {
    dependsOn(copyTextMateBundle)
}
```

NOTE: A `package.json` is also needed in the bundle directory for IntelliJ's TextMate engine to recognize it as a VS Code-format bundle. This file defines the grammar-to-language mapping. It can be a minimal subset of the VS Code extension's package.json, or it can be copied as-is (IntelliJ ignores irrelevant fields). The simplest approach is to create a static minimal `package.json` in the plugin's resources that references the grammar files, OR copy the full package.json from bbj-vscode and let IntelliJ pick up what it needs.

### Pattern 3: Bridging Custom FileType to TextMate Highlighting
**What:** Explicitly registering the TextMate syntax highlighter factory for the custom language to prevent the custom FileType from overriding TextMate highlighting.
**When to use:** When a plugin registers a custom `Language` + `FileType` (as BBj does) AND also uses TextMate bundles for highlighting.
**Example:**
```xml
<!-- In plugin.xml -->
<extensions defaultExtensionNs="com.intellij">
    <!-- Existing FileType from Phase 1 -->
    <fileType name="BBj"
        implementationClass="com.basis.bbj.intellij.BbjFileType"
        fieldName="INSTANCE"
        language="BBj"
        extensions="bbj;bbl;bbjt;src"/>

    <!-- Bridge TextMate highlighting to the BBj language -->
    <lang.syntaxHighlighterFactory
        language="BBj"
        implementationClass="org.jetbrains.plugins.textmate.language.syntax.highlighting.TextMateSyntaxHighlighterFactory"/>

    <!-- TextMate bundle provider -->
    <textmate.bundleProvider
        implementation="com.basis.bbj.intellij.BbjTextMateBundleProvider"/>
</extensions>
```

### Pattern 4: Minimal package.json for TextMate Bundle
**What:** The minimum VS Code-format package.json needed for IntelliJ to recognize the bundle.
**When to use:** Create a static file in the plugin resources OR generate during the Gradle copy.
**Example:**
```json
{
  "name": "bbj-textmate-bundle",
  "contributes": {
    "languages": [
      {
        "id": "bbj",
        "extensions": [".bbj", ".bbl", ".bbjt", ".src"],
        "configuration": "./bbj-language-configuration.json"
      },
      {
        "id": "bbx",
        "extensions": [".bbx"],
        "configuration": "./bbx-language-configuration.json"
      }
    ],
    "grammars": [
      {
        "language": "bbj",
        "scopeName": "source.bbj",
        "path": "./syntaxes/bbj.tmLanguage.json"
      },
      {
        "language": "bbx",
        "scopeName": "source.bbx",
        "path": "./syntaxes/bbx.tmLanguage.json"
      }
    ]
  }
}
```

### Anti-Patterns to Avoid
- **Static-copying grammar files into the repo:** Do NOT check in copies of the grammar files into `bbj-intellij/`. Always copy at build time from `bbj-vscode/`. This prevents drift.
- **Building a custom lexer for TextMate scopes:** The TextMate engine handles all tokenization. Do NOT write a JFlex lexer or BNF grammar for syntax highlighting.
- **Using the deprecated TextMateService API:** The old `TextMateService.getInstance().registerEnabledBundles()` approach is deprecated. Use `TextMateBundleProvider` extension point instead.
- **Ignoring the FileType/TextMate conflict:** Without explicitly registering `TextMateSyntaxHighlighterFactory` for the BBj language, the custom FileType will produce blank/no highlighting because the default highlighter is empty.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Syntax highlighting | Custom JFlex Lexer + SyntaxHighlighter | TextMate grammar via `TextMateBundleProvider` | The BBj grammar already exists, is battle-tested in VS Code, and covers all BBj syntax including case-insensitive keywords |
| Scope-to-color mapping | Manual `TextAttributesKey` mappings for every token type | IntelliJ's built-in TextMate scope-to-color mapping in `TextMateDefaultColorsProvider` | Automatically maps standard scopes like `keyword.control`, `string.quoted`, `comment.line` to IntelliJ theme colors |
| Bracket matching & auto-closing | Custom `BraceMatcher` implementation | Language-configuration.json via TextMate bundle | The bbj-language-configuration.json already defines brackets, auto-closing pairs, and surrounding pairs |
| Comment toggling (Ctrl+/) | Custom `Commenter` implementation | Language-configuration.json `comments.lineComment` field | Already defined as `"lineComment": "REM"` in bbj-language-configuration.json |
| Grammar file packaging | Manual resource copying or embedding | Gradle `Copy` task with `processResources` dependency | Build system handles it, no manual steps needed |

**Key insight:** The entire syntax highlighting pipeline is already solved by IntelliJ's TextMate plugin combined with the existing VS Code grammar. The only new code needed is the thin `TextMateBundleProvider` implementation and plugin.xml registration.

## Common Pitfalls

### Pitfall 1: Custom FileType Overrides TextMate Highlighting
**What goes wrong:** After registering a custom `Language` and `FileType` (Phase 1), TextMate syntax highlighting stops working. Files appear with no colors.
**Why it happens:** When IntelliJ has a registered `FileType` for an extension, it uses that FileType's associated `SyntaxHighlighter` instead of the TextMate engine. The default SyntaxHighlighter for a custom language is empty (highlights nothing).
**How to avoid:** Explicitly register `TextMateSyntaxHighlighterFactory` as the `lang.syntaxHighlighterFactory` for the BBj language in plugin.xml.
**Warning signs:** Opening a `.bbj` file shows the correct file icon (from Phase 1) but no syntax coloring.

### Pitfall 2: Bundle Not Found at Runtime
**What goes wrong:** `BbjTextMateBundleProvider.getBundles()` returns an empty list or throws because the grammar files are not in the JAR.
**Why it happens:** The Gradle copy task was not wired as a dependency of `processResources`, or the copy destination path does not match the `getResource()` path in Java code.
**How to avoid:** Ensure `tasks.named("processResources") { dependsOn(copyTextMateBundle) }` is in build.gradle.kts. Verify paths match exactly between the copy `into()` target and the `getResource()` path.
**Warning signs:** Plugin loads but files have no highlighting. Check IDE logs for TextMate-related errors.

### Pitfall 3: Missing package.json in Bundle
**What goes wrong:** IntelliJ's TextMate engine does not recognize the bundle because it cannot find a `package.json` descriptor.
**Why it happens:** IntelliJ supports VS Code-format bundles but requires `package.json` to identify the grammar-to-language mapping. Without it, the grammar files are ignored.
**How to avoid:** Include a `package.json` in the bundle directory that maps language IDs to grammar files and language configurations. Either copy the full one from bbj-vscode or create a minimal one.
**Warning signs:** Grammar files exist in resources but TextMate engine logs "no bundle found" or similar.

### Pitfall 4: TextMate Plugin Dependency Not Declared
**What goes wrong:** Build fails with "cannot resolve symbol" for `TextMateBundleProvider`, or runtime error that `com.intellij.textmate.bundleProvider` extension point is not found.
**Why it happens:** The TextMate plugin is bundled in IntelliJ but must be explicitly declared as a dependency in both `build.gradle.kts` (for compile-time) and `plugin.xml` (for runtime).
**How to avoid:** Add `bundledPlugin("org.jetbrains.plugins.textmate")` in build.gradle.kts dependencies AND `<depends>org.jetbrains.plugins.textmate</depends>` in plugin.xml.
**Warning signs:** Compilation errors referencing `org.jetbrains.plugins.textmate` package, or runtime ClassNotFoundException.

### Pitfall 5: Language Configuration onEnterRules Not Supported
**What goes wrong:** The `onEnterRules` from bbj-language-configuration.json do not work in IntelliJ.
**Why it happens:** IntelliJ's TextMate support handles `brackets`, `autoClosingPairs`, and `surroundingPairs` from VS Code language-configuration.json, but `onEnterRules` is a VS Code-specific feature that IntelliJ does not implement.
**How to avoid:** Accept that onEnterRules will not work in IntelliJ. This is a known limitation. Bracket matching, auto-closing, and comment toggling will work fine. Enhanced on-enter behavior can be added later via IntelliJ's native `EnterHandlerDelegate` if needed.
**Warning signs:** Comment continuation on Enter does not work (e.g., pressing Enter after `REM /**` does not auto-insert `REM  * `).

### Pitfall 6: Relative Path Issues in Monorepo
**What goes wrong:** The Gradle copy task cannot find `bbj-vscode/` because the path is relative and depends on where Gradle is invoked from.
**Why it happens:** `bbj-intellij/` is a standalone Gradle project (not a subproject of a root build). The parent directory reference `../bbj-vscode/` must be resolved correctly.
**How to avoid:** Use `${rootProject.projectDir}/../bbj-vscode/` or `${projectDir}/../bbj-vscode/` to reliably navigate to the sibling directory. Since bbj-intellij is the root project, both are equivalent.
**Warning signs:** Gradle build succeeds but no grammar files in the output JAR. Check the `build/resources/main/textmate/` directory.

## Code Examples

Verified patterns from official sources:

### TextMate Default Scope-to-Color Mappings (IntelliJ Built-In)

These are the mappings IntelliJ automatically applies to TextMate scopes. No plugin code is needed for these to work.

```java
// Source: https://github.com/JetBrains/intellij-community/blob/master/plugins/textmate/src/org/jetbrains/plugins/textmate/language/syntax/highlighting/TextMateDefaultColorsProvider.java
// The BBj grammar produces the following scopes which map automatically:

// keyword.control.bbj  ->  DefaultLanguageHighlighterColors.KEYWORD     (blue/orange in themes)
// string.quoted.double.bbj  ->  DefaultLanguageHighlighterColors.STRING  (green in most themes)
// string.quoted.single.bbj  ->  DefaultLanguageHighlighterColors.STRING
// comment.line.bbj  ->  DefaultLanguageHighlighterColors.LINE_COMMENT   (gray/green in themes)
// comment.block.bbj  ->  DefaultLanguageHighlighterColors.BLOCK_COMMENT
// constant.character.escape.bbj  ->  DefaultLanguageHighlighterColors.VALID_STRING_ESCAPE

// Full mapping table from IntelliJ source:
// "comment"                    -> LINE_COMMENT
// "comment.line"               -> LINE_COMMENT
// "comment.block"              -> BLOCK_COMMENT
// "comment.documentation"      -> DOC_COMMENT
// "constant"                   -> CONSTANT
// "constant.number"            -> NUMBER
// "constant.numeric"           -> NUMBER
// "constant.character.escape"  -> VALID_STRING_ESCAPE
// "constant.character.entity"  -> MARKUP_ENTITY
// "invalid"                    -> BAD_CHARACTER
// "invalid.deprecated"         -> DEPRECATED_ATTRIBUTES
// "keyword"                    -> KEYWORD
// "keyword.operator"           -> OPERATION_SIGN
// "storage"                    -> KEYWORD
// "storage.type"               -> KEYWORD
// "string"                     -> STRING
// "variable"                   -> LOCAL_VARIABLE
// "variable.parameter"         -> PARAMETER
// "entity"                     -> IDENTIFIER
// "entity.name"                -> CLASS_NAME
// "entity.name.class"          -> CLASS_NAME
// "entity.name.function"       -> FUNCTION_DECLARATION
// "entity.other.attribute-name" -> MARKUP_ATTRIBUTE
// "punctuation"                -> DOT
// "punctuation.definition.tag" -> MARKUP_TAG
// "support.function"           -> FUNCTION_CALL
// "support.type"               -> PREDEFINED_SYMBOL
// "meta.tag"                   -> METADATA
// "text source"                -> TEMPLATE_LANGUAGE_COLOR
// "markup.bold"                -> Bold font style
// "markup.italic"              -> Italic font style
// "markup.underline"           -> Underline effect
// "markup.heading"             -> Bold underline effect
```

### BBj Grammar Scope Analysis

The existing `bbj.tmLanguage.json` produces these scopes:

| Grammar Pattern | TextMate Scope | IntelliJ Color |
|----------------|----------------|----------------|
| Keywords (IF, WHILE, FOR, CLASS, etc.) | `keyword.control.bbj` | KEYWORD |
| Double-quoted strings | `string.quoted.double.bbj` | STRING |
| Single-quoted strings | `string.quoted.single.bbj` | STRING |
| Line comments (REM ...) | `comment.line.bbj` | LINE_COMMENT |
| Block comments (/@@...@/) | `comment.block.bbj` | BLOCK_COMMENT |
| String escape sequences | `constant.character.escape.bbj` | VALID_STRING_ESCAPE |

The `bbx.tmLanguage.json` additionally produces:
| Grammar Pattern | TextMate Scope | IntelliJ Color |
|----------------|----------------|----------------|
| Keywords (set, alias, etc.) | `keyword.bbj` | KEYWORD (via "keyword" prefix match) |
| `new` keyword | `keyword.operator.new` | OPERATION_SIGN |
| Line comments (#/;) | `comment.line.bbj` | LINE_COMMENT |
| Numeric constants | `constant.numeric.*.bbj` | NUMBER |
| Strings | `string.quoted.*.bbj` | STRING |

### plugin.xml Configuration
```xml
<!-- Source: Verified against Bruno IDE Extensions pattern + JetBrains docs -->
<idea-plugin>
    <id>com.basis.bbj.intellij</id>
    <name>BBj Language Support</name>
    <version>0.1.0</version>
    <vendor email="support@basis.cloud" url="https://basis.cloud">BASIS International</vendor>

    <description><![CDATA[
        BBj language support for IntelliJ IDEA. Provides file type recognition,
        syntax highlighting, and language server integration for BBj development.
    ]]></description>

    <idea-version since-build="242"/>

    <depends>com.intellij.modules.platform</depends>
    <depends>org.jetbrains.plugins.textmate</depends>

    <extensions defaultExtensionNs="com.intellij">
        <fileType
            name="BBj"
            implementationClass="com.basis.bbj.intellij.BbjFileType"
            fieldName="INSTANCE"
            language="BBj"
            extensions="bbj;bbl;bbjt;src"/>

        <lang.syntaxHighlighterFactory
            language="BBj"
            implementationClass="org.jetbrains.plugins.textmate.language.syntax.highlighting.TextMateSyntaxHighlighterFactory"/>

        <textmate.bundleProvider
            implementation="com.basis.bbj.intellij.BbjTextMateBundleProvider"/>
    </extensions>
</idea-plugin>
```

### Complete build.gradle.kts with TextMate Support
```kotlin
plugins {
    id("java")
    id("org.jetbrains.intellij.platform")
}

group = "com.basis.bbj"
version = "0.1.0-alpha"

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        intellijIdeaCommunity("2024.2")
        bundledPlugin("org.jetbrains.plugins.textmate")
        pluginVerifier()
        zipSigner()
        instrumentationTools()
    }
}

// Copy TextMate grammar files from bbj-vscode at compile time
val copyTextMateBundle by tasks.registering(Copy::class) {
    from("${projectDir}/../bbj-vscode/") {
        include("syntaxes/bbj.tmLanguage.json")
        include("syntaxes/bbx.tmLanguage.json")
        include("bbj-language-configuration.json")
        include("bbx-language-configuration.json")
    }
    into(layout.buildDirectory.dir("resources/main/textmate/bbj-bundle"))
}

tasks.named("processResources") {
    dependsOn(copyTextMateBundle)
}

tasks {
    patchPluginXml {
        sinceBuild.set("242")
        untilBuild.set("243.*")
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `TextMateService.registerEnabledBundles()` API | `TextMateBundleProvider` extension point | IntelliJ 2023.2 (build 232) | Use extension point, not programmatic API |
| Gradle IntelliJ Plugin 1.x `intellij { plugins = [...] }` | Gradle Plugin 2.x `bundledPlugin("...")` | 2024 | Different DSL syntax for declaring plugin dependencies |
| Manual scope-to-color mapping | Automatic via `TextMateDefaultColorsProvider` | Always been automatic for standard scopes | No need to create TextAttributesKey mappings for TextMate-based highlighting |

**Deprecated/outdated:**
- `TextMateService.getInstance().unregisterAllBundles()` / `registerEnabledBundles()` -- replaced by `TextMateBundleProvider` extension point
- Gradle IntelliJ Plugin 1.x syntax for bundled plugin dependencies

## Open Questions

Things that could not be fully resolved:

1. **Color Scheme Settings Page for BBj**
   - What we know: The user wants a BBj-specific section in Settings > Editor > Color Scheme. This requires implementing `ColorSettingsPage` and registering it with `com.intellij.colorSettingsPage`. However, TextMate-based highlighting does NOT use a custom `SyntaxHighlighter` with `TextAttributesKey` instances -- it uses the TextMate engine's scope-based mapping.
   - What's unclear: Whether a `ColorSettingsPage` can meaningfully customize TextMate-based token colors. The TextMate engine maps scopes to `DefaultLanguageHighlighterColors` keys which are shared across all languages. A BBj-specific `ColorSettingsPage` could expose these standard keys scoped to BBj display names, but the underlying colors would still be the theme's global keyword/string/comment colors unless language-specific overrides are created.
   - Recommendation: For Phase 2, skip the custom `ColorSettingsPage` and rely on IntelliJ's built-in theme colors for TextMate scopes. The TextMate highlighting already produces correct, theme-aware colors. A color settings page can be added in a later phase when custom semantic highlighting (via the language server) is introduced and there are BBj-specific token types to expose. Alternatively, if the user insists on a Color Scheme page now, create one that delegates to `DefaultLanguageHighlighterColors` keys with BBj-specific display names, letting users override keyword/string/comment colors specifically for BBj.

2. **lang.syntaxHighlighterFactory with TextMateSyntaxHighlighterFactory**
   - What we know: Multiple sources mention registering `TextMateSyntaxHighlighterFactory` for a custom language to bridge the custom FileType to TextMate highlighting. This is the pattern used in the JetBrains support forum discussion.
   - What's unclear: Whether this is the "official" recommended approach or a community workaround. The IntelliJ SDK documentation does not explicitly document this pattern.
   - Recommendation: Use this approach. It is the only known way to make a custom `Language`/`FileType` work with TextMate-based highlighting. If it does not work for the target platform version (242), the fallback is to NOT register a `lang.syntaxHighlighterFactory` and instead rely solely on the TextMate bundle's file extension mapping (which may conflict with the custom FileType registration). This should be validated during implementation.

3. **BBx file type registration**
   - What we know: The VS Code extension registers both `bbj` and `bbx` as separate languages with separate grammars. Phase 1 only registered `BbjFileType` for `.bbj`, `.bbl`, `.bbjt`, `.src` extensions.
   - What's unclear: Whether a separate `BbxFileType` and `BbxLanguage` should be registered for `.bbx` files, or if the TextMate bundle alone is sufficient for BBx highlighting.
   - Recommendation: For Phase 2, include the BBx grammar in the TextMate bundle so `.bbx` files get highlighting via pure TextMate (no custom FileType needed for BBx). A separate BbxFileType can be added later if language server features are needed for BBx files.

## Sources

### Primary (HIGH confidence)
- IntelliJ Community Source: `TextMateBundleProvider.kt` - Interface definition with `PluginBundle` data class and `getBundles()` method ([GitHub](https://github.com/JetBrains/intellij-community/blob/master/plugins/textmate/src/org/jetbrains/plugins/textmate/api/TextMateBundleProvider.kt))
- IntelliJ Community Source: `TextMateDefaultColorsProvider.java` - Complete scope-to-color mapping table ([GitHub](https://github.com/JetBrains/intellij-community/blob/master/plugins/textmate/src/org/jetbrains/plugins/textmate/language/syntax/highlighting/TextMateDefaultColorsProvider.java))
- Bruno IDE Extensions PR #11 - Real-world implementation of TextMateBundleProvider with Gradle copy task ([GitHub PR](https://github.com/usebruno/bruno-ide-extensions/pull/11))
- Local repository analysis: `bbj-vscode/syntaxes/bbj.tmLanguage.json`, `bbx.tmLanguage.json`, `bbj-language-configuration.json`, `bbx-language-configuration.json`
- IntelliJ Platform Plugin SDK: [Syntax Highlighter and Color Settings Page](https://plugins.jetbrains.com/docs/intellij/syntax-highlighter-and-color-settings-page.html)
- IntelliJ Platform Plugin SDK: [Color Scheme Management](https://plugins.jetbrains.com/docs/intellij/color-scheme-management.html)
- IntelliJ Platform Plugin SDK: [Dependencies Extension](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-dependencies-extension.html)

### Secondary (MEDIUM confidence)
- JetBrains Docs: [TextMate Bundles](https://www.jetbrains.com/help/idea/textmate-bundles.html) - User-facing TextMate bundle documentation
- JetBrains Docs: [TextMate](https://www.jetbrains.com/help/idea/textmate.html) - TextMate grammar overview
- IntelliJ Community Plugins EP List: [intellij.textmate.xml](https://plugins.jetbrains.com/docs/intellij/intellij-community-plugins-extension-point-list.html) - `textmate.bundleProvider` listed as standard (non-experimental) EP
- JetBrains Platform Forum: [Use textmate/vscode compliant syntax-highlighting in plugin](https://platform.jetbrains.com/t/use-textmate-vscode-compliant-syntax-highlighting-in-plugin/559)

### Tertiary (LOW confidence)
- JetBrains Support Forum: [Syntax Highlighting for Custom Filetype conflicts with Textmate bundle](https://intellij-support.jetbrains.com/hc/en-us/community/posts/360008202719) - The `TextMateSyntaxHighlighterFactory` registration workaround. This is a community-suggested pattern, not officially documented.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - TextMateBundleProvider is a verified, stable extension point with source code confirmation and real-world usage examples
- Architecture: HIGH - Pattern is well-documented through Bruno IDE example and IntelliJ source code; Gradle copy task is standard Gradle functionality
- Grammar structure: HIGH - Directly inspected the actual grammar files in the local repository
- Scope-to-color mapping: HIGH - Extracted from IntelliJ Community source code (`TextMateDefaultColorsProvider.java`)
- FileType/TextMate conflict resolution: MEDIUM - Based on community forum discussion; the `TextMateSyntaxHighlighterFactory` registration approach needs validation during implementation
- Color Scheme customization: LOW - Unclear how well `ColorSettingsPage` integrates with TextMate-based highlighting; recommendation is to defer

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (TextMate plugin API is stable; IntelliJ 2024.2 is established)
