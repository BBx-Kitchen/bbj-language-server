---
sidebar_position: 3
title: Roadmap
---

# Roadmap

This page outlines the current state of the BBj Language Server project and planned future improvements. It's relevant for both users wanting to know what's coming and developers looking for contribution opportunities.

Besides the issues tracked on [GitHub Issues](https://github.com/BBx-Kitchen/bbj-language-server/issues), the following major tasks remain:

### 1. Enriched Code Completion

**Current State:** The extension uses JSON files (located in `examples/javadoc`) to enhance code completion with proper documentation and parameter names instead of generic `arg1`, `arg2`, etc.

**To Do:**
- Ship these JSON files with BBj in a standard location (e.g., `<bbj>/documentation/javadoc/`)
- Regenerate documentation files with every BBj build or upon request
- Use documentation sources directly for comments rather than downloading via wget
- Consider marking specific sections in documentation sources to serve as IDE hints

### 2. Extended JavaDoc Support

Include JavaDoc from sources for non-BBj Java classes, similar to how Eclipse and IntelliJ provide documentation for standard library classes.

### 3. Eclipse Integration

For using the Langium-based server from Eclipse, there is a sample project at [langium-eclipse](https://github.com/dhuebner/langium-eclipse) based on [LSP4E](https://github.com/eclipse/lsp4e).

**Goal:** Set up a BDT-type plugin to use the new language server, eventually replacing redundancy with BLTK.

### 4. IntelliJ Integration

Investigate IntelliJ plugin development using the [Language Server Protocol support](https://plugins.jetbrains.com/docs/intellij/language-server-protocol.html).

### 5. Project Restructuring

Consider separating the Java interop service, VS Code extension, and Language Server into distinct packages for better modularity and reusability.

### 6. Build Automation

Implement automated releases to the VS Code Marketplace. Currently, QA manually publishes new versions.

## Contributing

If you're interested in working on any of these items:

1. Check the [GitHub Issues](https://github.com/BBx-Kitchen/bbj-language-server/issues) for related discussions
2. Read the [Contributing Guide](/docs/developer-guide/contributing)
3. Reach out via GitHub to coordinate efforts
