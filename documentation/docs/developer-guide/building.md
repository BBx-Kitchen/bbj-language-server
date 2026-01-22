---
sidebar_position: 3
title: Building
---

# Building the Project

This guide covers how to build and run the BBj Language Server project from source.

## Prerequisites

### Required Software

- **Node.js** 18 or higher
- **npm** 9 or higher
- **Java Development Kit (JDK)** 17 or higher
- **Git**

### Optional

- **VS Code** for development and testing
- **Gitpod** for cloud-based development

## Quick Start with Gitpod

The easiest way to get started is using Gitpod:

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/BBx-Kitchen/bbj-language-server)

This opens a pre-configured VS Code environment that automatically builds the project.

## Local Development Setup

### Clone the Repository

```bash
git clone https://github.com/BBx-Kitchen/bbj-language-server.git
cd bbj-language-server
```

### Building the VS Code Extension

```bash
cd bbj-vscode

# Install dependencies
npm install

# Generate Langium grammar and build
npm run prepare
```

The `prepare` script:
1. Generates TypeScript from the Langium grammar
2. Compiles TypeScript to JavaScript
3. Bundles the extension

### Building the Java Interop Service

```bash
cd java-interop

# Build with Gradle
./gradlew build
```

This produces `build/libs/java-interop.jar`.

## Development Commands

### VS Code Extension

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run prepare` | Full build (grammar + compile) |
| `npm run build` | Compile TypeScript only |
| `npm run watch` | Watch mode for development |
| `npm run langium:generate` | Generate parser from grammar |
| `npm run langium:watch` | Watch grammar for changes |
| `npm run lint` | Run ESLint |
| `npm run test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |

### Java Interop Service

| Command | Description |
|---------|-------------|
| `./gradlew build` | Build the JAR |
| `./gradlew run` | Run the service |
| `./gradlew test` | Run tests |
| `./gradlew clean` | Clean build outputs |

## Running in VS Code

### Launch Configurations

The project includes VS Code launch configurations in `.vscode/launch.json`:

1. **Run Interop Service** - Starts the Java interop service
2. **Run Extension** - Launches VS Code with the extension loaded
3. **Attach to Language Server** - Debug the language server
4. **Vitest: Run All** - Run all tests

### Development Workflow

1. Open the project in VS Code
2. Start the Java Interop Service:
   - Run `./gradlew run` in terminal, OR
   - Use "Run Interop Service" launch config
3. Press `F5` to launch the extension
4. A new VS Code window opens with the extension active
5. Open a `.bbj` file to test

### Watch Mode

For active development, use watch mode:

```bash
# Terminal 1: Watch TypeScript
cd bbj-vscode
npm run watch

# Terminal 2: Watch Langium grammar (if editing grammar)
npm run langium:watch

# Terminal 3: Run Java service
cd java-interop
./gradlew run
```

## Project Structure

```
bbj-language-server/
├── bbj-vscode/                 # VS Code extension
│   ├── src/
│   │   ├── language/           # Language server implementation
│   │   │   ├── bbj.langium     # Grammar definition
│   │   │   ├── generated/      # Auto-generated code
│   │   │   └── *.ts            # Service implementations
│   │   ├── Commands/           # VS Code commands
│   │   └── extension.ts        # Extension entry point
│   ├── syntaxes/               # TextMate grammars
│   ├── snippets/               # Code snippets
│   ├── test/                   # Test suite
│   └── package.json
├── java-interop/               # Java service
│   ├── src/main/java/
│   │   └── bbj/interop/        # Service implementation
│   └── build.gradle
└── documentation/              # This documentation
```

## Build Outputs

### VS Code Extension

- `bbj-vscode/out/` - Compiled JavaScript
- `bbj-vscode/syntaxes/gen-*.json` - Generated TextMate grammars

### Java Service

- `java-interop/build/libs/java-interop.jar` - Executable JAR

## Common Issues

### Grammar Generation Fails

```bash
# Clean and regenerate
rm -rf src/language/generated
npm run langium:generate
```

### TypeScript Errors After Grammar Changes

After modifying `bbj.langium`:

```bash
npm run langium:generate
npm run build
```

### Java Service Won't Start

Check port 5008 is available:

```bash
lsof -i :5008
```

### Extension Not Loading

1. Check Output panel for errors
2. Verify build completed successfully
3. Try reloading the window (`Ctrl+R` / `Cmd+R`)

## Production Build

For publishing to VS Code Marketplace:

```bash
cd bbj-vscode
npm run vscode:prepublish
```

This creates an optimized, minified build.

## Packaging the Extension

To create a `.vsix` package:

```bash
npm install -g @vscode/vsce
cd bbj-vscode
vsce package
```

This produces `bbj-lang-x.x.x.vsix`.
