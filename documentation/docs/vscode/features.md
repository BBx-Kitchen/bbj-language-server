---
sidebar_position: 3
title: Features
---

# Features

The BBj Language Server provides a comprehensive set of features to enhance your BBj development experience in VS Code.

## Code Completion

Get intelligent suggestions as you type:

- **BBj Keywords**: All BBj verbs and statements
- **Built-in Functions**: Complete list of BBj functions with documentation
- **Variables**: Global and local variable suggestions
- **Java Classes**: Full Java class, method, and field completions
- **Snippets**: Common code patterns and templates

### Completion Triggers

Completions automatically appear when:
- Typing after a dot (`.`) for method/field access
- Starting a new statement
- Inside function parameters
- After `use` statements for class imports

## Syntax Highlighting

Rich semantic highlighting for:

- Keywords and verbs
- String literals and numbers
- Comments (single-line and multi-line)
- Class and method names
- Variable references
- Labels and line numbers

## Validation and Diagnostics

Real-time error detection:

- **Syntax Errors**: Invalid BBj syntax
- **Undefined References**: Missing variables, labels, or classes
- **Access Violations**: Incorrect access to class members
- **Type Mismatches**: Incompatible type operations

Errors appear as you type with detailed messages and quick fixes where available.

## Hover Information

Hover over elements to see:

- **Functions**: Parameter signatures and documentation
- **Variables**: Type information
- **Classes**: Java class documentation (JavaDoc)
- **Methods**: Method signatures with parameter names

## Code Navigation

### Go to Definition

- `F12` or `Ctrl+Click` to jump to definitions
- Works for classes, methods, variables, and labels
- Supports cross-file navigation

### Find All References

- `Shift+F12` to find all usages
- Useful for refactoring and understanding code

### Document Symbols

- `Ctrl+Shift+O` to list all symbols in the file
- Quick navigation within large files
- Shows classes, methods, variables, and labels

## Code Formatting

Format your BBj code with configurable options:

- **Indentation**: Configurable indent width
- **Line Continuation**: Option to remove line continuations
- **Keyword Case**: Convert keywords to uppercase
- **IF Statement Formatting**: Split single-line IF statements

Format the document with `Shift+Alt+F` or configure format-on-save.

## Developer Commands

### Run Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Run as GUI | `Alt+G` | Run program in BBj GUI mode |
| Run as BUI | `Alt+B` | Run program as BUI web application |
| Run as DWC | `Alt+D` | Run program as DWC application |

### Build Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Compile | `Alt+C` | Compile BBj program to bytecode |
| Decompile | `Alt+X` | Decompile compiled BBj program |
| Denumber | `Alt+N` | Remove line numbers from program |

### Configuration Commands

- **Show config.bbx**: Open the BBj configuration file
- **Show BBj.properties**: Open BBj properties file
- **Open Enterprise Manager**: Launch the EM web interface
- **Show Classpath Entries**: Display available classpath entries

## Java Integration

Seamless integration with Java classes:

- **Class Completions**: All classes from configured classpath
- **Method Signatures**: Full parameter information
- **Field Access**: Public field completions
- **JavaDoc**: Documentation from Java sources
- **Import Suggestions**: Automatic `use` statement suggestions

## Snippets

Built-in code snippets for common patterns:

- Comment blocks
- Routine definitions
- Interface declarations
- Boolean constants (`BBjAPI.TRUE`/`BBjAPI.FALSE`)
- Control structures

Access snippets by typing the prefix and pressing `Tab`.

## File Support

The extension supports multiple BBj file types:

| Extension | Description |
|-----------|-------------|
| `.bbj` | BBj source files |
| `.bbl` | BBj library files |
| `.bbjt` | BBj template files |
| `.bbx` | BBj configuration files |

## Workspace Features

- **Multi-file Support**: Cross-file references and navigation
- **Class Indexing**: Automatic indexing of class definitions
- **Import Resolution**: Resolve imports across workspace
- **Symbol Search**: Workspace-wide symbol search

## Auto-Save

Configure automatic saving before running programs:

```json
{
  "bbj.web.AutoSaveUponRun": true
}
```
