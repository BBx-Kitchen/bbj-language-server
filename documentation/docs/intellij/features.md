---
sidebar_position: 3
title: Features
---

# Features

The BBj Language Support plugin provides a comprehensive set of features to enhance your BBj development experience in IntelliJ IDEA.

## Code Completion

Get intelligent suggestions as you type:

- **BBj Keywords**: All BBj verbs and statements
- **Built-in Functions**: Complete list of BBj functions with documentation
- **Variables**: Global and local variable suggestions
- **Java Classes**: Full Java class, method, and field completions (via Java interop service)
- **Custom Icon Mapping**: BBj-specific completion icons for different element types

### Completion Triggers

Completions automatically appear when:
- Typing after a dot (`.`) for method/field access
- Starting a new statement
- Inside function parameters
- After `USE` statements for class imports

## Syntax Highlighting

Rich semantic highlighting powered by TextMate grammars (`bbj.tmLanguage.json`, `bbx.tmLanguage.json`):

- **Keywords and Verbs**: BBj language keywords
- **String Literals and Numbers**: Constant values
- **Comments**: Single-line and multi-line comments
- **Class and Method Names**: Type identifiers
- **Variable References**: Local and global variables
- **Labels and Line Numbers**: Jump targets

### Customization

Customize colors via **Settings** > **Editor** > **Color Scheme** > **BBj**.

## Validation and Diagnostics

Real-time error detection as you type:

- **Syntax Errors**: Invalid BBj syntax
- **Undefined References**: Missing variables, labels, or classes
- **Access Violations**: Incorrect access to class members
- **Type Mismatches**: Incompatible type operations

Errors appear as squiggles in the editor with detailed messages.

## Hover Information

Hover over elements to see:

- **Functions**: Parameter signatures and documentation
- **Variables**: Type information
- **Java Classes**: JavaDoc documentation from Java sources
- **Methods**: Method signatures with parameter names

## Code Navigation

### Go to Definition

Navigate to symbol definitions:

- **Mac**: `Cmd+Click` or `Cmd+B`
- **Windows/Linux**: `Ctrl+Click` or `Ctrl+B`

Works for:
- Classes
- Methods
- Variables
- Labels

Supports cross-file navigation.

## Signature Help

Parameter hints appear as you type function arguments:

- Shows parameter names and types
- Displays current parameter position
- Updates dynamically as you type

## Document Symbols (Structure View)

Navigate large files efficiently:

- Access via the **Structure** tool window
- Shows classes, methods, variables, and labels
- Click to jump to symbol definition
- Powered by LSP `textDocument/documentSymbol`

Quick access: `Cmd+F12` (Mac) or `Ctrl+F12` (Windows/Linux)

## Comment Toggling

Toggle line comments quickly:

- **Mac**: `Cmd+/`
- **Windows/Linux**: `Ctrl+/`

Uses `REM` prefix for BBj comments.

## Bracket Matching

Automatic matching for `()`, `[]`, `{}`:

- Highlights matching brackets when cursor is adjacent
- Helps navigate nested structures

## Spell Checking

Intelligent spell checking with BBj awareness:

- Bundled BBj keyword dictionary
- BBj keywords not flagged as typos
- Standard IntelliJ spell checking for comments and strings

## Run Commands

Execute BBj programs directly from the editor. See [Commands](./commands) page for full details.

Quick reference:

| Command | Shortcut | Description |
|---------|----------|-------------|
| Run as GUI | `Alt+G` | Run program in BBj GUI mode |
| Run as BUI | `Alt+B` | Run program as BUI web application |
| Run as DWC | `Alt+D` | Run program as DWC application |
| Compile | - | Compile BBj program to bytecode |

## Java Interop

Seamless integration with Java classes:

- **Class Completions**: All classes from configured classpath
- **Method Signatures**: Full parameter information
- **Field Access**: Public field completions
- **JavaDoc**: Documentation from Java sources
- **Connection State**: Status bar widget shows Connected/Disconnected/Checking

### Requirements

Java interop requires:

1. BBjServices running
2. Classpath configured in BBj settings
3. Proper BBj Home configuration

Check the **Java Interop** status bar widget for connection state.

## File Type Support

The plugin recognizes multiple BBj file types:

| Extension | Description |
|-----------|-------------|
| `.bbj` | BBj source files |
| `.bbjt` | Tokenized BBj files |
| `.src` | BBj source files (legacy) |
| `.bbx` | BBx configuration files |
| `.bbl` | BBj library files (recognized for run commands) |

## Status Bar Widgets

Real-time status information in the IDE status bar:

### Language Server Status

Shows the state of the BBj Language Server:

- **Ready**: Server running normally
- **Starting**: Server initialization in progress
- **Stopped**: Server not running
- **Error**: Server encountered an error

### Java Interop Status

Shows the connection state of the Java interop service:

- **Connected**: Java interop service is available
- **Disconnected**: Service not available
- **Checking**: Connection check in progress

Click the widget to view more details or restart the service.

## Editor Banners

Contextual notifications appear at the top of the editor to help with configuration:

- **Missing BBj Home** - Set BBj Home in Settings to enable language features
- **Missing Node.js** - Install Node.js or let the plugin download it automatically
- **Java Interop Unavailable** - Start BBjServices or check configuration
- **Server Crash** - Language server encountered an error; check logs

Follow the banner instructions to resolve configuration issues.

## Server Log Tool Window

Debug language server issues:

- **BBj Language Server** log panel in the bottom tool window
- Console output from the language server process
- Error messages and diagnostic information
- Useful for troubleshooting startup issues

Access via **View** > **Tool Windows** > **BBj Language Server** or click the status bar widget.
