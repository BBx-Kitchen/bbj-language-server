---
sidebar_position: 1
title: Developer Guide
slug: /developer-guide
---

# Developer Guide

This guide is for developers who want to contribute to the BBj Language Server project or understand its internal architecture.

## Project Overview

The BBj Language Server consists of three main components:

1. **VS Code Extension** (`/bbj-vscode/`) - TypeScript-based extension with Langium language server
2. **Java Interop Service** (`/java-interop/`) - Java service for classpath introspection
3. **Documentation** (`/documentation/`) - This Docusaurus site

## Quick Links

### Architecture

| Topic | Description |
|-------|-------------|
| [Overview](./architecture/overview.md) | High-level architecture and component interaction |
| [Language Server](./architecture/language-server.md) | Langium-based language server details |
| [Java Integration](./architecture/java-interop.md) | Java interop service and communication protocol |

### Development

| Topic | Description |
|-------|-------------|
| [Building](./building.md) | Build instructions and development setup |
| [Testing](./testing.md) | Test framework and writing tests |
| [Contributing](./contributing.md) | Contribution guidelines |

## Technology Stack

### TypeScript/Node.js

- **[Langium](https://langium.org/)** - Grammar-based language server framework
- **[Chevrotain](https://chevrotain.io/)** - Parser building toolkit
- **[vscode-languageserver](https://github.com/microsoft/vscode-languageserver-node)** - LSP implementation

### Java

- **[LSP4J](https://github.com/eclipse-lsp4j/lsp4j)** - JSON-RPC communication
- **Java Reflection** - Runtime class introspection
- **Gradle** - Build automation

## Repository Structure

```
bbj-language-server/
├── bbj-vscode/           # VS Code extension & language server
│   ├── src/language/     # Core language server
│   ├── src/Commands/     # VS Code commands
│   └── test/             # Test suite
├── java-interop/         # Java classpath service
│   └── src/main/java/    # Service implementation
├── documentation/        # This documentation
└── .github/workflows/    # CI/CD pipelines
```

## Getting Started with Development

1. Clone the repository
2. Follow the [Building Guide](./building.md) to set up your environment
3. Read the [Architecture Overview](./architecture/overview.md) to understand the codebase
4. Check out [Contributing](./contributing.md) for guidelines
5. Review the [Roadmap](/docs/roadmap) to see planned work and contribution opportunities
