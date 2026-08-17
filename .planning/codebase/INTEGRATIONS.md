# External Integrations

**Analysis Date:** 2026-02-01

> ⚠ SUPERSEDED — 2026-08-17
> `.planning/reviews/INVENTORY.md` is the authority on review scope, structure and file counts for
> the v4.0 milestone (D-16); this map was not regenerated.
>
> Known-wrong in this map:
> - Describes the java-interop connection as a fixed `localhost:5008` socket; `java-interop.ts` now
>   exposes `setConnectionConfig(host, port)`, making both host and port configurable — this map
>   documents neither the API nor the configurability.
> - Omits EM token-based authentication entirely (`bbj-intellij/src/main/java/com/basis/bbj/intellij
>   /actions/BbjEMTokenStore.java`, `bbj-vscode/tools/em-login.bbj`,
>   `bbj-vscode/tools/em-validate-token.bbj`), all absent from this map.
> - Omits the BBjCPL compiler integration (`bbj-cpl-service.ts`, `bbj-cpl-parser.ts`) added in v3.7 —
>   no `BBjCPL`/`cpl` mention anywhere in this file.

## APIs & External Services

**BBj Compiler & Runtime:**
- BBj Language Server - Provides program compilation, execution, and debugging
  - SDK/Client: Native execution via `child_process.exec()`
  - Configuration: `bbj.home` setting points to BBj installation directory
  - Usage: Located in `src/Commands/Commands.cjs` for compile, decompile, run commands

**Java Classpath Service:**
- Java Interop Service - Provides Java class metadata for code completion and type checking
  - SDK/Client: JSON-RPC over socket communication via `vscode-jsonrpc`
  - Connection: TCP socket on localhost:5008 (default port defined in `src/language/java-interop.ts`)
  - Implementation: `java-interop/src/` - standalone Java application using Eclipse LSP4J
  - Classes: `JavaInteropService` in `src/language/java-interop.ts` manages connection lifecycle

**Enterprise Manager (EM):**
- Web UI for BBj administration and monitoring
  - Usage: `bbj.em` command opens EM interface in browser
  - Configuration: `bbj.web.username` and `bbj.web.password` settings

## Data Storage

**Databases:**
- Not directly used by extension/language server
- BBj runtime may use BBj databases (external system)
- Java classpath introspection: In-memory caching in `JavaInteropService._resolvedClasses` Map

**File Storage:**
- Local filesystem only
- Configuration files: BBj.properties (`{bbj.home}/cfg/BBj.properties`)
- Workspace files: `.bbj`, `.bbl`, `.bbjt`, `.src` file extensions
- Tools directory: `bbj-vscode/tools/` contains BBj helper programs (`web.bbj`, formatter scripts)

**Caching:**
- In-memory cache: `JavaInteropService._resolvedClasses` - Map-based caching of resolved Java classes
- Document cache: Langium `LangiumDocuments` service manages parsed document ASTs
- Index cache: `BBjIndexManager` caches symbol index per workspace

## Authentication & Identity

**Auth Provider:**
- Custom (Web runner authentication via configuration)
  - Username: `bbj.web.username` (default: "admin")
  - Password: `bbj.web.password` (default: "admin123")
  - Implementation: Passed directly to BBj web runner (`web.bbj`) in `src/Commands/Commands.cjs`
  - Scope: Web-based program execution only (GUI, BUI, DWC runners)

**BBj Home Configuration:**
- Critical configuration: `bbj.home` setting (required)
- No centralized auth; credentials are workspace-level configuration
- Credentials stored in VS Code settings (typically in `.vscode/settings.json`)

## Monitoring & Observability

**Error Tracking:**
- None detected - no error tracking service integrated

**Logs:**
- VS Code Extension Output: Logged via `console.log()`, `console.error()` to VS Code output panel
- Language Server: Langium LSP logs via vscode-languageserver
- Debug Mode: `DEBUG_BREAK` env var enables Node.js inspector on port 6009 (configurable via `DEBUG_SOCKET`)
- Error propagation: Exceptions caught in `src/Commands/Commands.cjs` and shown to user via `vscode.window.showErrorMessage()`

**Debugging:**
- Node.js Inspector: Enabled via launch configuration in VS Code
- Language Server Debug: Separate debug configuration for language server process
- Java Interop Service: Debuggable via IDE (VS Code Debugger for Java extension recommended)

## CI/CD & Deployment

**Hosting:**
- VS Code Marketplace - Official distribution channel for extension
- GitHub Pages - Documentation hosted at `BBx-Kitchen.github.io/bbj-language-server/`
- Repository: GitHub (`https://github.com/BBx-Kitchen/bbj-language-server/`)

**CI Pipeline:**
- GitHub Actions - `.github/workflows/` (content not detailed in exploration)
- Gitpod support - `.gitpod.yml` for cloud development environment

**Build Process:**
- npm scripts: `npm run prepare`, `npm run build`, `npm run esbuild`
- TypeScript compilation: `tsc -b tsconfig.json`
- Gradle build: `./gradlew build` in java-interop directory
- VSCode publishing: `npm run vscode:prepublish` (minification + linting)

## Environment Configuration

**Required env vars:**
- `DEBUG_BREAK` - Set to 'true' to wait for debugger attachment on language server startup
- `DEBUG_SOCKET` - Port for Node.js inspector (default: 6009)
- `BBJ_HOME` - Referenced indirectly via VS Code setting `bbj.home` (not environment variable)

**VS Code Settings (bbj.* namespace):**
- `bbj.home` - Path to BBj installation directory (REQUIRED)
- `bbj.classpath` - Classpath entry name (default: "bbj_default")
- `bbj.web.username` - Web runner username (default: "admin")
- `bbj.web.password` - Web runner password (default: "admin123")
- `bbj.web.apps` - Object mapping program names to web app configurations
- `bbj.web.AutoSaveUponRun` - Auto-save before program execution (boolean)
- `bbj.formatter.*` - Formatter options (indent width, line continuations, etc.)
- `bbj.compiler.*` - Compiler options (type checking, line numbering, output control, content modification, diagnostics)

**Secrets location:**
- VS Code workspace settings (`.vscode/settings.json`)
- No separate secrets file or environment-based secret management
- Credentials stored in plaintext in settings (security consideration)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected - integration is synchronous/request-response only

## Web Program Execution

**Web Runner:**
- Client programs executed via BBj web runner: `web.bbj`
- Location: `bbj-vscode/tools/web.bbj`
- Supports three execution modes:
  - BUI (Browser User Interface) - Modern web UI
  - DWC (Desktop Web Client) - Legacy web UI
  - GUI (Graphical User Interface) - Native desktop
- URL pattern: `http://127.0.0.1:{port}/{program_name}` (port managed by BBj runtime)

## Symbol & Type Information

**Java Class Information:**
- Source: Java classpath accessible via java-interop service
- Classes tracked in memory in `JavaInteropService._resolvedClasses`
- Implicit Java imports (always available):
  - `java.lang`
  - `com.basis.startup.type`
  - `com.basis.bbj.proxies`
  - `com.basis.bbj.proxies.sysgui`
  - `com.basis.bbj.proxies.event`
  - `com.basis.startup.type.sysgui`
  - `com.basis.bbj.proxies.servlet`

**BBj Built-in Library:**
- Synthetic document: `classpath:/bbj.class`
- Contains standard BBj library classes and methods
- Loaded from `src/language/lib/` directory

---

*Integration audit: 2026-02-01*
