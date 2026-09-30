<p align="center"><img src="documentation/static/img/logo.png" width="96" alt="BBj logo"></p>

# BBj Language Support for VS Code and IntelliJ

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang)
[![JetBrains Marketplace](https://img.shields.io/badge/JetBrains-Marketplace-000000?logo=jetbrains&logoColor=white)](https://plugins.jetbrains.com/plugin/30033-bbj-language-support)
[![Documentation](https://img.shields.io/badge/docs-BBx--Kitchen.github.io-2E8555)](https://BBx-Kitchen.github.io/bbj-language-server/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

BBj Language Support brings modern IDE tooling to BBj development in Visual Studio Code and
IntelliJ IDEA. One shared BBj language server powers both editors, so completion, diagnostics,
and navigation behave the same wherever you write BBj. Code completion reaches beyond BBj
keywords and functions into the Java classes, methods, and fields on your BBj classpath, and
errors — including BBj's own compiler diagnostics — surface as you type. Run your programs as
GUI, BUI, or DWC straight from the editor, and let the built-in visual composers write BBj calls
like MSGBOX, addWindow, and SETOPTS for you.

## Install

**Visual Studio Code**

- [Install from the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang)
- Or open the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`), search for "BBj", and install
  **BBj Programming Language Support** by BASIS International Ltd.
- Quick Open: `ext install basis-intl.bbj-lang`

**IntelliJ IDEA**

- [Install from the JetBrains Marketplace](https://plugins.jetbrains.com/plugin/30033-bbj-language-support)
- Or go to **Settings > Plugins > Marketplace**, search for "BBj", install
  **BBj Language Support**, and restart the IDE.

**Offline install**

The `.vsix` file and the IntelliJ `.zip` file are attached to every
[GitHub release](https://github.com/BBx-Kitchen/bbj-language-server/releases). Install them with
VS Code's "Install from VSIX..." or IntelliJ's "Install Plugin from Disk...".

**After installing**

On BBj 25.00 and later, enable the "BBj Language Service" in Enterprise Manager, then point the
extension or plugin at your BBj installation. Follow the Getting Started guide for
[VS Code](https://bbx-kitchen.github.io/bbj-language-server/docs/vscode/getting-started) or
[IntelliJ IDEA](https://bbx-kitchen.github.io/bbj-language-server/docs/intellij/getting-started)
for the full walkthrough.

## Documentation

**Full documentation lives at
[BBx-Kitchen.github.io/bbj-language-server](https://BBx-Kitchen.github.io/bbj-language-server/).**

| Topic | VS Code | IntelliJ IDEA |
|-------|---------|----------------|
| Getting Started | [VS Code](https://bbx-kitchen.github.io/bbj-language-server/docs/vscode/getting-started) | [IntelliJ IDEA](https://bbx-kitchen.github.io/bbj-language-server/docs/intellij/getting-started) |
| Features | [VS Code](https://bbx-kitchen.github.io/bbj-language-server/docs/vscode/features) | [IntelliJ IDEA](https://bbx-kitchen.github.io/bbj-language-server/docs/intellij/features) |
| Configuration | [VS Code](https://bbx-kitchen.github.io/bbj-language-server/docs/vscode/configuration) | [IntelliJ IDEA](https://bbx-kitchen.github.io/bbj-language-server/docs/intellij/configuration) |
| Commands | [VS Code](https://bbx-kitchen.github.io/bbj-language-server/docs/vscode/commands) | [IntelliJ IDEA](https://bbx-kitchen.github.io/bbj-language-server/docs/intellij/commands) |
| Composers | [VS Code](https://bbx-kitchen.github.io/bbj-language-server/docs/vscode/composers) | [IntelliJ IDEA](https://bbx-kitchen.github.io/bbj-language-server/docs/intellij/composers) |

## Requirements

- BBj 25.00 or higher, with BBjServices running locally
- Java 17 or higher
- BBj 26.03 or higher for live compiler diagnostics (an earlier BBj keeps the save-time compiler
  check)
- Visual Studio Code 1.101.0 or higher
- IntelliJ IDEA 2024.2 or higher (Community or Ultimate), plus Node.js 22 or higher
  (auto-detected from PATH, or auto-downloaded by the plugin)

See the Getting Started guides for
[VS Code](https://bbx-kitchen.github.io/bbj-language-server/docs/vscode/getting-started) and
[IntelliJ IDEA](https://bbx-kitchen.github.io/bbj-language-server/docs/intellij/getting-started)
for full setup details.

## Help and feedback

- [GitHub Issues](https://github.com/BBx-Kitchen/bbj-language-server/issues) — report bugs or
  request features
- [BBj Documentation](https://documentation.basis.cloud/BASISHelp/WebHelp/index.htm) — the
  official BBj language reference

---

Contributing? Issues and pull requests are welcome; build and test notes for contributors are in
[CLAUDE.md](CLAUDE.md). Licensed under the [MIT License](LICENSE).
