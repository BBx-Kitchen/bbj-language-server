# Technology Stack

**Analysis Date:** 2026-09-21

## Languages

**Primary:**
- **TypeScript** 5.8.3 - VS Code extension, language server, test code in `bbj-vscode/src/**/*.ts`

**Secondary:**
- **Kotlin/Java** - IntelliJ plugin (`bbj-intellij/`) targeting JDK 17
- **Java** 17 - java-interop socket service (`java-interop/`) for classpath resolution

**Supplementary:**
- **HTML/CSS/JavaScript** - VS Code UI components, TextMate grammar definitions
- **Markdown** - Documentation and README files

## Runtime

**Environment:**
- Node.js >= 22 (VS Code extension, language server, build tools)
- Java Development Kit (JDK) 17 (java-interop service, IntelliJ plugin)

**Package Manager:**
- npm (TypeScript projects, manages `package-lock.json`)
- Gradle 8+ (Java projects, Gradle wrapper via `gradlew`)

**Lockfiles:**
- `package-lock.json` (npm)
- Gradle lock file (Gradle)

## Frameworks

**Core Language Server:**
- **Langium** ~4.3.1 - DSL framework for language servers; defines grammar in `bbj-vscode/src/language/bbj.langium`, generates AST and parser
- **Chevrotain** ~12.0.0 - Parser generator used by Langium (LLStar lookahead strategy with ambiguity detection)

**Lexing/Parsing:**
- Custom Langium lexer (`bbj-lexer.ts`) with line-continuation support via `prepareLineSplitter`
- Langium's default parser infrastructure (overridden for Chevrotain logging redirection in `bbj-module.ts`)

**LSP Client/Server:**
- **vscode-languageserver** ^10.1.0 - LSP 3.18.2 protocol implementation
- **vscode-languageclient** ^10.1.0 - VS Code LSP client
- **LSP4IJ** 0.21.0 - IntelliJ LSP integration (plugin dependency)
- **vscode-jsonrpc** ^8.2.1 - JSON-RPC transport for Java interop communication

**Text/Grammar:**
- **vscode-textmate** ^9.3.2 - TextMate grammar parser
- **vscode-oniguruma** ^2.0.1 - OnigRegExp support for TextMate syntax highlighting

**Configuration & Properties:**
- **properties-file** ^5.0.7 - Read/write BBj properties files
- **properties-reader** ^3.0.1 - Parse BBj configuration (config.bbx)

**Documentation:**
- **Docusaurus** 3.9.2 - Static site generator for user/developer guides, published to GitHub Pages

**Packaging & Distribution:**
- **@vscode/vsce** ^3.7.1 - VS Code extension packaging and Marketplace publishing
- **esbuild** ^0.28.1 - Module bundler for extension and language server (tree-shaking, minification)

## Testing

**TypeScript/JavaScript:**
- **Vitest** ^4.1.10 - Test runner (configured in `bbj-vscode/vitest.config.ts`)
  - Coverage provider: v8
  - Reporters: text, html, json-summary
  - Thresholds: lines 50%, functions 45%, branches 40%, statements 50%
- **@vitest/coverage-v8** ^4.1.10 - Coverage reporting

**Java:**
- **JUnit** 6.1.3 (junit-jupiter) - Test framework for IntelliJ plugin and java-interop
- **junit-platform** 6.1.3 - Test launcher

**Build & Integration:**
- Langium's **EmptyFileSystem** + **validationHelper** - Test utilities for parsing/validation
- Langium's **DocumentBuilder** test seam - Validate documents without LSP connection

## Build & Development Tools

**TypeScript Compilation:**
- **typescript** ^5.8.3 - Source language, compiler, type checking
- **langium-cli** ~4.3.0 - Langium grammar generator (`npm run langium:generate` → AST, parser, DI module)

**Linting & Code Quality:**
- **eslint** ^10.9.1 - Code linter
- **typescript-eslint** ^8.69.0 - TypeScript ESLint rules

**Bundling & Packaging:**
- **esbuild** ^0.28.1 - Bundles extension.ts + language server into `out/main.js` and `out/language/main.cjs`
- **shx** ^0.4.0 - Cross-platform shell commands (license copying)
- **concurrently** ^10.0.5 - Run tsc + esbuild in parallel during development

**Gradle (Java):**
- IntelliJ Platform Gradle Plugin - Plugin development and packaging for IDEA
- Gradle wrapper (auto-provisioned, handles version alignment)

## Key Dependencies

**Critical:**
- **langium** ~4.3.1 - Core framework; grammar changes require `npm run langium:generate`
- **vscode-languageserver** ^10.1.0 - LSP server protocol; defines diagnostic, completion, hover, etc.
- **chevrotain** ~12.0.0 - Parser engine; pre-existing ambiguity warnings are benign (documented in memory)

**Infrastructure:**
- **vscode-jsonrpc** ^8.2.1 - Connects to java-interop service via Socket + JSON-RPC
- **vscode-textmate** ^9.3.2 - Syntax highlighting; grammar sync'd manually between LS and IntelliJ plugin
- **properties-reader** ^3.0.1 - Parses config.bbx (BBj configuration files)

**Development:**
- **@types/vscode** ^1.101.0 - VS Code API type definitions
- **@types/node** ^26.4.1 - Node.js type definitions

## Configuration Files

**TypeScript:**
- `bbj-vscode/tsconfig.json` - Target ES6, module Node16, strict mode enabled, no emit (compilation-only)
- `documentation/tsconfig.json` - Docusaurus types

**Build:**
- `bbj-vscode/vitest.config.ts` - Vitest settings; coverage excludes generated files, extension entry
- `bbj-vscode/esbuild.mjs` - Esbuild bundler config; produces `out/main.js` and `out/language/main.cjs`

**Linting:**
- `bbj-vscode/eslint.config.js` - ESLint rules for src/ and test/

**Language:**
- `bbj-vscode/bbj-language-configuration.json` - VSCode language configuration for .bbj/.bbjt/.src files
- `bbj-vscode/bbx-language-configuration.json` - VSCode language configuration for .bbx config files
- `bbj-vscode/syntaxes/bbj.tmLanguage.json` - TextMate grammar for BBj syntax (case-insensitive)
- `bbj-vscode/syntaxes/bbx.tmLanguage.json` - TextMate grammar for BBx config syntax

**Documentation:**
- `documentation/docusaurus.config.ts` - Docusaurus site config; publishes to GitHub Pages

**Gradle:**
- `bbj-intellij/build.gradle.kts` - IntelliJ plugin build; targets IDEA 2024.2+, JDK 17
- `bbj-intellij/settings.gradle.kts` - Gradle project configuration
- `java-interop/build.gradle` - Java interop service build (Groovy DSL), with `java-interop/settings.gradle`

## IDE Support

**VS Code:**
- Minimum version: 1.101.0
- Extension activates on: `onLanguage:bbj`, `onLanguage:bbx-config`, command activations
- Runs language server as child process via `vscode-languageclient`

**IntelliJ IDEA:**
- Platform: 2024.2+ (configured in `build.gradle.kts`)
- Plugin wraps the compiled LS binary (`out/language/main.cjs`) via LSP4IJ
- Bundles TextMate grammar and language configuration copied from VS Code extension

## Environment & Deployment

**Development:**
- Node 22 (enforced in package.json engines)
- JDK 17 (enforced in gradle.properties or build.gradle.kts)

**Production (VS Code):**
- Packaged as VSIX using vsce
- Requires VS Code 1.101.0+
- Published to VS Code Marketplace by `publish` workflow

**Production (IntelliJ):**
- Packaged as ZIP by Gradle `buildPlugin` task
- Published to JetBrains Marketplace by `intellijPlatformPublishing` Gradle block
- Requires IntelliJ IDEA 2024.2+

**Documentation:**
- Built by Docusaurus, deployed to GitHub Pages via `deploy-docs.yml` workflow
- Requires Node 20+ (from package.json engines)

---

*Stack analysis: 2026-09-21*
