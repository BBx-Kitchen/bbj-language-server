# BBj Language Server and VSCode Plug-In

## Structure

This project comes with three parts which are for now deeply intertwined. Langium builds together with the VSCode extension, but can, in theory, also serve other IDEs like IntelliJ or Eclipse, or a standalone editor like Monaco.
At a later moment we will consider splitting this project and offering the language server separately:


### Langium-based Language Server

The Language Server is implemented in TypeScript and can be found under the "extension" subdirectoy.
It's based on Langium - https://langium.org/, and the current implementation for BBj has entirely been provided by TypeFox, the company behind Langium. 

### Java-Part

The java-interop part contains a Java project with Gradle build automation that builds a java-interop.jar. This Java code opens a service / socket for the Langium-TypeScript part to talk to.
The Java code is responsible for providing code assist, based on reflection.

### VSCode extention

As part of the TypeScript project part, the project also builds a VSCode extension, that incorporates some developer convenience functions like starting in GUI, BUI, DWC, or code formatting.

__See also the README.md in this project for info on building etc.__

## Known Missing Pieces and Issue Tracking

Besides the issues filed under https://github.com/BBx-Kitchen/bbj-language-server/issues the following major tasks remain before the project can be considered production-ready:

### 1.Java Service
The Java part is currently injected into BBj Services whenever the VSCode extension launches a .bbj program for the first time. This launch creates an autolaunch in BBj using the Admin API to start java-interop.bbj with every start of BBjServices. At the same time, the extension 
makes a redundant start of the interop service every time a bbj program is loaded.

__What we want to consider instead:__

We can build the Java part as part of BBj itself and offer it as a server to be optionally enabled in Enterprise Manager. This ensures everything is in place and
that it's always current and matches the BBj version. 
An argument can be made that a VSCode extension shall be self-contained and bring everything needed to edit a file type on an arbitrary computer.
However, since no developer can run a BBj program without a BBj Service running, we may see a strong reason to relocate the Java part directly into BBj.

Unclear as yet if we could even embed the complete TypeScript-based langugage server implementation directly in BBj. (Put on the parking lot.)

### 2. Enriched Code Completion

To enhance code completion, the plug-in also uses a set of JSON files located under examples/javadoc. These can be copied to
<bbx>/documentation/javadoc/ . When being found by the language server, they will add documentation to the method signatures, and show the proper variable names instead of arg1, arg2 etc from the sources.
The program used to generate this first set of files (hacky!) is in the same directoy "genjdoc.bbj"

__To Do:__

* ship these JSON files with BBj, in this proposed location or some other 
* regenerate with every build or upon request
* use the documentation sources for the comments, rather that downloading the documentation with wget
* consider specific sections (marked in the doc sources?) that would serve as the IDE doc hints

### 3. More JavaDoc

We will want to also include JavaDoc from sources for non-BBj classes, like Eclipse and IntelliJ do. To be figured out.

### 4. Eclipse 

For the Langium based server to be used from Eclipse there is a sample project:
   https://github.com/dhuebner/langium-eclipse which is based on https://github.com/eclipse/lsp4e.
We will want to figure out how to set up a BDT-type plug-in to use the new language server, to remove the redundancy with BLTK in the long run.

### 5. IntelliJ

Figure out IntelliJ - https://plugins.jetbrains.com/docs/intellij/language-server-protocol.html

### 6. Clean up

Potentially find a good moment to separate the Java part, VSCode extension and the Language Server. TBD. Don't know yet.