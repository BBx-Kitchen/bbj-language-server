---
sidebar_position: 2
title: Getting Started
---

# Getting Started

The BBj Language Support plugin provides comprehensive IDE support for BBj development in IntelliJ IDEA. This guide will help you get up and running quickly.

## Prerequisites

Before installing the plugin, ensure you have:

- **IntelliJ IDEA** version 2024.2 or higher (Community or Ultimate)
- **BBj** version 25.00 or higher installed
- **BBjServices** running locally (required for full functionality)
- **Java 17** or higher (for the Java interop service)
- **Node.js 18** or higher (auto-detected from PATH, or auto-downloaded by plugin)

## Installation

### From JetBrains Marketplace

1. Open IntelliJ IDEA
2. Go to **Settings** > **Plugins** > **Marketplace** tab
3. Search for "BBj"
4. Click **Install** on "BBj Language Support"
5. Restart the IDE when prompted

Alternatively, install directly from the [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/24199-bbj-language-support).

### From .zip File

For offline installation:

1. Download the `.zip` file from [GitHub Releases](https://github.com/BBx-Kitchen/bbj-language-server/releases)
2. Open IntelliJ IDEA
3. Go to **Settings** > **Plugins**
4. Click the gear icon and select **Install Plugin from Disk...**
5. Select the downloaded `.zip` file
6. Restart the IDE when prompted

## Initial Configuration

After installation, configure the plugin to work with your BBj installation:

### BBj Home

1. Go to **Settings** > **Languages & Frameworks** > **BBj**
2. The plugin automatically detects BBj Home if installed in a standard location
3. If not found, set the path manually using the browse button
4. The plugin validates the path by checking for `BBj.properties` in the `cfg/` subdirectory

### Node.js Runtime

Node.js is required for the language server to function:

1. The plugin automatically detects Node.js from your system PATH
2. If not found, the plugin can auto-download Node.js 18 or higher
3. You can manually set the Node.js path in **Settings** > **Languages & Frameworks** > **BBj** if needed

### Enable BBj Language Service

BBj 25.00 introduces a new server component, the BBj Language Service. You must enable it in Enterprise Manager:

1. Open BBj Enterprise Manager
2. Navigate to the server settings
3. Enable the "BBj Language Service"

![Enable BBj Language Service in Enterprise Manager](/img/enable_ls_in_bbj.png)

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
   - **BBj Language Server** status widget in the status bar showing "Ready"

## Running Your First Program

With a `.bbj` file open:

1. Press `Alt+G` to run as a GUI application
2. Or right-click in the editor and select **Run As BBj Program**
3. Or press `Alt+B` to run as a BUI web application (requires EM authentication first)
4. Or press `Alt+D` to run as a DWC application (requires EM authentication first)

## Troubleshooting

### Language Server Not Starting

If features like completion aren't working:

1. Check the **BBj Language Server** tool window in the bottom panel for error output
2. Verify Node.js is available and accessible
3. Try **Tools** > **Restart BBj Language Server**

### Java Integration Not Working

The Java interop service requires:

1. BBjServices to be running
2. Proper BBj Home configuration
3. Valid classpath configuration

Check the **Java Interop** status bar widget for connection state (Connected/Disconnected/Checking).

### Missing Configuration Banners

The plugin displays editor banners to help with configuration:

- **Missing BBj Home** banner - Set BBj Home in Settings
- **Missing Node.js** banner - Install Node.js or let the plugin download it
- **Java Interop Unavailable** banner - Start BBjServices or check configuration
- **Server Crash** banner - Check the BBj Language Server tool window for errors

Follow the banner instructions to resolve configuration issues.

## Next Steps

- Learn about [Features](./features) available in the plugin
- Configure [Plugin Settings](./configuration)
- Explore [Run Commands](./commands) for executing BBj programs
