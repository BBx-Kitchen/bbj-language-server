---
sidebar_position: 2
title: Getting Started
---

# Getting Started

The BBj Language Server provides comprehensive IDE support for BBj development in Visual Studio Code. This guide will help you get up and running quickly.

## Prerequisites

Before installing the extension, ensure you have:

- **Visual Studio Code** version 1.67.0 or higher
- **BBj** version 25.00 or higher installed
- **BBjServices** running locally (required for full functionality)
- **Java 17** or higher (for the Java interop service)

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "BBj"
4. Click **Install** on "BBj Language Support"

Alternatively, install directly from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang).

### From VSIX File

If you have a `.vsix` file:

1. Open VS Code
2. Go to Extensions view
3. Click the `...` menu and select "Install from VSIX..."
4. Select the downloaded `.vsix` file

## Initial Configuration

After installation, configure the extension to work with your BBj installation:

### Enable BBj Language Service

BBj 25.00 introduces a new server component, the BBj Language Service. You must enable it in Enterprise Manager:

1. Open BBj Enterprise Manager
2. Navigate to the server settings
3. Enable the "BBj Language Service"

![Enable BBj Language Service in Enterprise Manager](/img/enable_ls_in_bbj.png)

### Setting BBj Home

1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "bbj.home"
3. Set the path to your BBj installation directory (e.g., `/opt/bbj` or `C:\bbj`)

Alternatively, add to your `settings.json`:

```json
{
  "bbj.home": "/path/to/bbj"
}
```

### Configuring Classpath

To enable Java class completions, configure the classpath:

```json
{
  "bbj.classpath": "default"
}
```

The extension will automatically detect classpath entries from your BBj installation.

## Testing Your Setup

1. Create a new file with a `.bbj` extension
2. Type some BBj code:

```bbj
print "Hello, World!"
```

3. You should see:
   - Syntax highlighting
   - Code completion suggestions when typing
   - Validation errors if any syntax issues exist

## Running Your First Program

With a `.bbj` file open:

1. Press `Alt+G` to run as a GUI application
2. Or press `Alt+B` to run as a BUI web application
3. Or press `Alt+D` to run as a DWC application

You can also right-click in the editor and select the run option from the context menu.

## Troubleshooting

### Language Server Not Starting

If features like completion aren't working:

1. Check the Output panel (`View` > `Output`)
2. Select "BBj Language Server" from the dropdown
3. Look for error messages

### Java Integration Not Working

The Java interop service requires:

1. BBjServices to be running
2. Proper `bbj.home` configuration
3. Valid classpath configuration

Start the interop service manually if needed:

```bash
cd java-interop
./gradlew run
```

## Next Steps

- Learn about [Features](./features) available in the extension
- Configure [Extension Settings](./configuration)
- Explore the [Architecture](/docs/developer-guide/architecture/overview) of the language server (Developer Guide)
