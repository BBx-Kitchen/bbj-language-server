# BBj Language Server

This project provides a language server for the BBj language, powering a VS Code extension and
an IntelliJ plugin.

## Documentation

**Full documentation is available at: [BBx-Kitchen.github.io/bbj-language-server](https://BBx-Kitchen.github.io/bbj-language-server/)**

- [VS Code Guide](https://bbx-kitchen.github.io/bbj-language-server/docs/vscode)
- [IntelliJ Guide](https://bbx-kitchen.github.io/bbj-language-server/docs/intellij)

## Project Overview

The project consists of three main parts:

 * `bbj-vscode` – VS Code extension with BBj language server based on [Langium](https://langium.org/)
 * `java-interop` – Java executable that provides information about the Java classpath (classes, fields, methods) via a [JSON-RPC](https://www.jsonrpc.org/) connection
 * `bbj-intellij` – IntelliJ plugin that runs the same language server through [LSP4IJ](https://github.com/redhat-developer/lsp4ij)

## How to Test

The easiest way is to open the project in [Gitpod](https://gitpod.io/).

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/BBx-Kitchen/bbj-language-server)

This opens a VS Code instance in your browser that automatically builds the project code. Once the terminal processes are done:

 1. Open a terminal and run `./gradlew run` in the `java-interop` folder – this starts a Java application that listens for connections from the language server.
 2. Go to the "Run and Debug" view and start the _Run Extension_ launch configuration – this first runs the "build bbj-vscode" task, then starts a second instance of VS Code (in a new browser tab) that contains the BBj language extension and its language server.

Once the new VS Code instance is started, open a bbj file and see how the editor behaves.

### Building Locally

If you want to test this project on your local machine, you need to install [Node.js](https://nodejs.org/) 22 or
later and a JDK 17. Then execute the following commands, one folder at a time.

 * In the `bbj-vscode` subfolder: `npm install`, then `npm run build`. `npm install` only
   regenerates the grammar and does not build; `npm run build` writes `out/extension.cjs` and
   `out/language/main.cjs`. (The "Run Extension" launch configuration in `.vscode/launch.json`
   also runs this build first, via its `preLaunchTask`.)
 * In the `java-interop` subfolder: `./gradlew build` (or `./gradlew run` to start the interop
   service on port 5008).
 * In the `bbj-intellij` subfolder: `./gradlew buildPlugin`, after building `bbj-vscode` – it
   stops early if `bbj-vscode/out/language/main.cjs` is missing.

