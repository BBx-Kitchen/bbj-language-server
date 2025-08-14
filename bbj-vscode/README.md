# BBj Language Support for BBj

This extension adds support for the BBj language. It allows you to locate your local BBj installation for resolution of Classpath and PREFIX, running your code from the editor, and to host the Java-part of the language server.

## Disclaimer

This extension is in an early pre-release state. We know that it's still missing essential features and still has flaws.
Nevertheless we are greatful to feedback and issue reports. Like the extension in the marketplace if you find it useful, and see https://github.com/BBx-Kitchen/bbj-language-server/issues for our issue tracking. 

Contributors welcome!

## Features

* Syntax Highlight for bbj files and config.bbx
* Code Completion using a Language Server for BBj based on https://langium.org/
* Code Formatting (using BBjCodeFormatter)
* A short command to show the config.bbx ^ BBj.properties
* Run bbj code from the editor directly
* A short command to launch BBj's enterprise manager

## Installation Requirements

* BBj 25.00 and up
* BBjServices has to run locally (for now)


### Important Information: Upgrading this extension from Pre-25 versions

If you were using the Pre-25 version of the extension (0.x.x version numbers), make sure to completely uninstall them, and clean up your BBj install:

1. Remove the extension from VSCode completely before continuing with the Setup
2. Go to BBj Enterprise Manager, and remove the "vscode" Classpath, and the "vscode" Autorun Job

Failing to do so may result in unpredictable failure.

## Setup

1. BBj 25.00 introduces a new Server, the BBj Language Service. Go to Enterprise Manager and enable it
2. Install the extension using the Extensions functionality in VSCode
3. Configure the BBj directory by opening the settings, then search for "BBj" and edit the "Bbj: Home" variable in your settings.json

## Optional Setup
1. Auth Token:
To provide an authentication token for launching Web Apps, set the value in the settings using bbj.web.authToken.


### Credits

Special thanks to https://github.com/hyyan who initially created some parts to integrate with BBj in an earlier VS Code extension, which we decided to scavenge for this extension.

We also thank the team at https://www.typefox.io/ and https://langium.org/ for their ongoing support in making this extension possible.

