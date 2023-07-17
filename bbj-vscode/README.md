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

* Java 17
* BBj 23.00 and up

## Setup

1. Install the extension
2. Configure the BBj directory by opening the settings, then search for "BBj" and edit the "Bbj: Home" variable in your settings.json
3. The plug-in launches a Java-based module inside your local BBj installation. This module will be automatically configured upon first start. See below for further details.  



### Java Interop Module

The Java Interop Module configures a local BBj to host the Java part of the language server directly inside a locally installed and running BBj Service.

The initialization process runs automatically whenever the extension is activated. For debugging purposes the initialization can be manually triggered with a Command "BBj: Initialize BBj interop service"

When successful, this initialization process performs the following actions:

1. Create a classpath in BBj Services named "vscode" and adds the jar files shipped with the extension in the subdirectory "/java-interop/lib/"
2. Adds an autostart task group "vscode" to BBj Services to launch the interop services with every startup, and 
3. starts the interop service thread right away if not already running.

The interop service is a Java thread that cannot be seen in BBj's process list in Enterprise Manager.

After initial install of the extension or potentially after an update of the extension you may have to restart VSCode and your local BBjServices.


#### Note:
Altenatively, the Java interop part can be run isolated from BBj as described under https://github.com/BBx-Kitchen/bbj-language-server, if no local BBj installation is running. However, Code Completion will the not be able to resolve BBj built-in types.  


### Credits

Special thanks to https://github.com/hyyan who initially created some parts to integrate with BBj in an earlier VS Code extension, which we decided to scavenge for this extension.

We also thank the team at https://www.typefox.io/ and https://langium.org/ for their ongoing support in making this extension possible.

