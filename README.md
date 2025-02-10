# BBj Language Server

This project provides a language server and VS Code extension for the BBj language.

## Project Overview

The project consists of two main parts:

 * `bbj-vscode` – VS Code extension with BBj language server based on [Langium](https://langium.org/)
 * `java-interop` – Java executable that provides information about the Java classpath (classes, fields, methods) via a [JSON-RPC](https://www.jsonrpc.org/) connection

## How to Test

The easiest way is to open the project in [Gitpod](https://gitpod.io/).

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/BBx-Kitchen/bbj-language-server) [![Open in Codeanywhere](https://codeanywhere.com/img/open-in-codeanywhere-btn.svg)](https://app.codeanywhere.com/#https://github.com/BBx-Kitchen/bbj-language-server)

This opens a VS Code instance in your browser that automatically builds the project code. Once the terminal processes are done, go to the "Run and Debug" view and start two launch configurations:

 1. _Run Interop Service_ (requires the "Debugger for Java" extension) – this starts a Java application that listens for connections from the language server.
    * Alternatively, you can execute the command `./gradlew run` in the `java-interop` subfolder (works without additional VS Code extension).
 2. _Run Extension_ – this starts a second instance of VS Code (in a new browser tab) that contains the BBj language extension and its language server.

Once the new VS Code instance is started, open a bbj file and see how the editor behaves.

### Building Locally

If you want to test this project on your local machine, you need to install [Node.js](https://nodejs.org/) and [JDK](https://openjdk.org/). Then execute the following commands.

 * In the `bbj-vscode` subfolder: `npm install`
 * In the `java-interop` subfolder: `./gradlew assemble`
