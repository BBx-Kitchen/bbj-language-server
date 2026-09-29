---
last_mapped_commit: 3a02c40ab6022a5dcc590e6a19bd9ce0f5cdebbb
---

# External Integrations

**Analysis Date:** 2026-09-28

## APIs & External Services

**Java Interop Backend:**
- **Service**: java-interop socket service (port 5008, localhost by default)
- **What it's used for**: Resolves Java classes, methods, fields, Javadoc from the BBj classpath
- **Connection**: Socket + JSON-RPC via `vscode-jsonrpc` in `bbj-vscode/src/language/java-interop.ts`
- **SDK/Client**: `JavaInteropService` class (custom implementation)
- **Config env vars**: `bbj.interop.host` (default "localhost"), `bbj.interop.port` (default 5008)
- **Circuit breaker**: Handles outages with exponential backoff (initial 5s, max 30s cooldown, P61-D3-001)
- **Caching**: LRU cache of 5,000 resolved classes; survives ~30 minutes of typical editing
- **Implicit imports**: Auto-imports `java.lang`, `com.basis.startup.type`, `com.basis.bbj.proxies`, `com.basis.bbj.proxies.sysgui`, `com.basis.bbj.proxies.event`, `com.basis.startup.type.sysgui`, `com.basis.bbj.proxies.servlet`

**BBj Compiler (bbjcpl):**
- **Service**: Native BBj compiler binary (`bbjcpl`)
- **What it's used for**: Syntax validation, error diagnostics, compile-time checks
- **Location**: Discovered via `bbj.home` setting; spawned as child process in `bbj-vscode/src/language/bbj-cpl-service.ts`
- **Integration**: Runs on file save or debounced typing (configurable via `bbj.compiler.trigger`)
- **Timeout**: 30 seconds (configurable via `BBjCPLService.setTimeout()`)
- **Config env vars**: `bbj.home` (BBj installation path), `bbj.compiler.trigger` ("debounced"/"on-save"/"off")
- **Failure handling**: Logs warnings, gracefully degrades (returns empty diagnostics if bbjcpl unavailable)

**Enterprise Manager (EM):**
- **Service**: BBj's web-based admin/runtime system (typically http://localhost:8888)
- **What it's used for**: Running BUI and DWC programs; querying server configuration
- **Integration**: Commands `bbj.run`, `bbj.runBUI`, `bbj.runDWC`, `bbj.em`, `bbj.loginEM` invoke EM
- **Config env vars**: `bbj.em.url` (Enterprise Manager URL)
- **Auth**: EM login credentials managed via EM's own auth (em-login.bbj)
- **Failure handling**: If EM unavailable, run commands fail with error message

**BBj Runtime (GUI/DWC Execution):**
- **Service**: BBj runtime services for executing programs
- **What it's used for**: Running `.bbj` programs as GUI, BUI, or DWC applications
- **Classpath**: Configured via `bbj.classpath` setting (e.g., "bbj_default", "addon", "barista")
- **Integration**: VS Code commands and right-click context menus trigger program execution

## Data Storage

**Databases:**
- Not used. No external database integration.

**File Storage:**
- Local filesystem only
- Virtual library files served via `BBjLibraryFileSystemProvider` (`bbj-vscode/src/language/lib/fs-provider.ts`)
  - Provides synthetic `classpath:/bbj.bbl` with built-in BBj function signatures (synchronized with `bbj-vscode/src/language/lib/functions.ts`)
- BBj config files (config.bbx) read from disk

**Caching:**
- **Java classpath cache**: LRU map bounded to 5,000 entries (see `RESOLVED_CLASSES_CACHE_LIMIT` in `java-interop.ts`), per-session memory only
- **Resolved class cache**: In-memory LRU, evicts least-recently-used classes via `LruMap<K, V>` utility class
- **Config file path cache**: Memory cache with filesystem watcher (`bbj-vscode/src/config-path-cache.ts`, `bbj-vscode/src/config-watcher.ts`)
- **Implicit imports cache**: Cached after first load from java-interop service; expires on breaker recovery

**Session Persistence:**
- No persistent session storage
- Each LS restart clears all caches

## Authentication & Identity

**Auth Provider:**
- Custom integration with BBj's own authentication
- Enterprise Manager login via `em-login.bbj` (run-tool)
- No OAuth, SAML, or external identity providers

**Implementation:**
- EM credentials stored in VS Code's secret storage (`secretStorage` API) — platform-specific: macOS Keychain, Windows Credential Manager, Linux libsecret
- BBj-side credentials managed by EM system
- Login flow triggered by `bbj.loginEM` command

## Monitoring & Observability

**Error Tracking:**
- Not detected. No external error tracking service (Sentry, DataDog, etc.)

**Logs:**
- **Output channel**: Langium's LSP diagnostic notifications → VS Code Output panel
- **Logger**: Configurable debug level via `bbj.debug` setting
  - `LogLevel.DEBUG` - detailed diagnostics, class loading, validation messages
  - `LogLevel.WARN` - normal operation (default)
- **Console output**: Errors logged to `console.error()` (captured by VS Code)
- **Java interop logs**: Connection failures, timeouts, circuit breaker state transitions
- **Logger instance**: Centralized in `bbj-vscode/src/language/logger.ts`

**Metrics:**
- No metrics collection or telemetry
- Vitest coverage reports available locally via `npm run test:coverage`

## CI/CD & Deployment

**Hosting:**
- VS Code Marketplace (VSIX extension)
- JetBrains Marketplace (IntelliJ plugin ZIP)
- GitHub Pages (Docusaurus documentation site)
- GitHub Releases (release artifacts)

**GitHub Actions Workflows:**

**Build Validation (`.github/workflows/build.yml`):**
- **Triggers**: Pull requests to main
- **Runner**: ubuntu-latest, 20-minute timeout
- **Steps**: Checkout → Node 22 setup → npm ci → npm run build → npm run lint → npm run typecheck:test → npm run test → npx vsce package
- **Artifacts**: VS Code extension (.vsix)

**Workflow Hygiene (`.github/workflows/workflow-hygiene.yml`):**
- **Triggers**: Push and pull request to main
- **Checks**:
  - No secrets in workflow `run:` bodies (via `bbj-vscode/tools/check-workflow-secrets.mjs`)
  - Gradle wrapper checksum validation (via `bbj-vscode/tools/check-gradle-wrapper.mjs`)

**Preview Releases (`.github/workflows/preview.yml`):**
- **Triggers**: Push to main (serialized concurrency to prevent duplicate version bumps)
- **Workflow_dispatch**: Manual trigger available
- **Steps**:
  1. Verify: Build, test, auto-bump patch version, package both extensions
  2. Bump version: Commit and push version bump to main
  3. Publish VS Code: `vsce publish --pre-release` with `VSCE_PAT` secret
  4. Publish IntelliJ: `./gradlew publishPlugin -PintellijChannel=preview` with `JETBRAINS_MARKETPLACE_TOKEN` secret
- **Version scheme**: Auto-increments patch (e.g., 25.12.0 → 25.12.1)
- **Artifacts**: Retained 7 days

**Manual Release (`.github/workflows/manual-release.yml`):**
- **Triggers**: `workflow_dispatch` with version input (must match x.y.0 format and be greater than current)
- **Runner**: ubuntu-latest
- **Verification gate**: All jobs depend on `verify` job; nothing publishes or tags until verification succeeds
- **Steps**:
  1. Verify (required): Build, test, package both extensions, run `verifyPlugin` on IntelliJ plugin against recommended IDEs
  2. Publish VS Code: `vsce publish` with `VSCE_PAT` secret (depends on verify)
  3. Publish IntelliJ: `./gradlew publishPlugin` with `JETBRAINS_MARKETPLACE_TOKEN` secret (depends on verify)
  4. Tag release: Create git tag `v<VERSION>`, push to main, push tag (depends on both publishes)
  5. Create GitHub Release: Upload artifacts with pre-formatted installation instructions (depends on tag)
- **Artifacts**: Retained 1 day
- **Plugin Verifier cache**: Cached per OS; ~210 MB for Plugin Verifier downloads; IDE downloads NOT cached (too large, 4.9–14.6 GB)

**Documentation Deployment (`.github/workflows/deploy-docs.yml`):**
- **Triggers**: Push to main with changes under `documentation/` or workflow file itself; manual via workflow_dispatch
- **Runner**: ubuntu-latest
- **Environment**: GitHub Pages (write permission required)
- **Steps**: Checkout → Node 22 setup → npm ci → npm run build → upload artifact → deploy to Pages
- **Result**: Published at https://BBx-Kitchen.github.io/bbj-language-server/

**Build Process:**
```bash
npm install                    # Install dependencies
npm run langium:generate       # Generate AST/grammar from .langium
npm run build                  # Compile TypeScript + bundle
npm test                       # Run all vitest suites
npm run lint                   # ESLint check
npx vsce package               # Create VSIX for VS Code
./gradlew buildPlugin          # Create ZIP for IntelliJ
./gradlew verifyPlugin         # Verify IntelliJ plugin compatibility
```

**Release Publishing:**
- VS Code: `vsce publish` (authenticated via `VSCE_PAT` secret from account settings)
- IntelliJ: Gradle `intellijPlatformPublishing` block (authenticated via `JETBRAINS_MARKETPLACE_TOKEN` secret)
- Docs: GitHub Pages deploy action (automatic with `id-token: write` permission)

**Secrets Management:**
- `VSCE_PAT`: VS Code Marketplace Personal Access Token (stored in GitHub repository secrets)
- `JETBRAINS_MARKETPLACE_TOKEN`: JetBrains Marketplace authentication token (stored in GitHub repository secrets)
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions for release creation and artifact access

## Environment Configuration

**Required env vars (client-side, VS Code settings):**
- `bbj.home` - Path to BBj installation directory
- `bbj.classpath` - Classpath entry name (default: "bbj_default")
- `bbj.em.url` - Enterprise Manager URL (e.g., http://localhost:8888)
- `bbj.interop.host` - Java interop hostname (default: "localhost")
- `bbj.interop.port` - Java interop port (default: 5008)
- `bbj.configPath` - Path to BBj config file (optional, computed if not set)
- `bbj.debug` - Enable debug logging (boolean, default: false)

**Compiler options (buildable from UI):**
- Type checking: `-t` (enable), `-W` (warnings), `-c` (config file), `-CP` (classpath)
- Line numbering: `-n` (renumber), `-s` (start line), `-i` (interval), `-D` (remove line numbers)
- Output: `-d` (directory), `-x` (extension), `-X` (keep extension), `-F` (force overwrite), `-N` (validate only)
- Content: `-r` (remove REM), `-p` (protect), `-e` (error log)

**Formatter options (configurable):**
- `bbj.formatter.indentWidth` - Indentation spaces (default: 2)
- `bbj.formatter.removeLineContinuation` - Remove continuations (default: false)
- `bbj.formatter.keywordsToUppercase` - Convert keywords to uppercase (default: false)
- `bbj.formatter.splitSingleLineIF` - Split single-line IF (default: false)

**Diagnostic options:**
- `bbj.diagnostics.suppressCascading` - Suppress downstream errors (default: true)
- `bbj.diagnostics.maxErrors` - Max parse errors shown (default: 20)
- `bbj.typeResolution.warnings` - Warn on CAST/USE/inheritance issues (default: true)
- `bbj.compiler.trigger` - When to run bbjcpl ("debounced"/"on-save"/"off")

**Inlay hints:**
- `bbj.inlayHints.parameterNames.enabled` - Show parameter names ("none"/"literals"/"all", default: "literals")

**Secrets location:**
- VS Code secret storage (platform-specific: macOS Keychain, Windows Credential Manager, Linux libsecret)
- EM login credentials stored via `secretStorage.store('bbj.em.password', ...)`
- GitHub Actions repository secrets (accessible only during workflow runs via `secrets.*` context)

**Decompile/Denumber prompts:**
- `bbj.decompile.promptOnOpen` - Prompt when opening tokenized files (default: true)
- `bbj.denumber.promptOnOpen` - Prompt when opening numbered files (default: true)

## Webhooks & Callbacks

**Incoming Webhooks:**
- No incoming webhooks. The language server is not HTTP-based (LSP only).

**Outgoing Webhooks/Callbacks:**

**Configuration Watcher:**
- Watches `config.bbx` file for changes via filesystem watcher
- Triggers `bbj/configReloadRequired` notification to client
- Client requests language server restart to pick up new config
- Integration: `createConfigWatcher()` in `bbj-vscode/src/extension.ts`, armed after first workspace build

**Java Class Reload Notifications:**
- `bbj/javaClassesRefreshed` - Fired when `bbj.refreshJavaClasses` command completes
- `bbj/javaConnectionError` - Fired when java-interop service becomes unavailable
- Recovery callback: `onConnectionRecovered()` listener re-validates open documents silently
- Handler in `bbj-vscode/src/language/bbj-notifications.ts`

**Config Reload Notifications:**
- `bbj/resolvedConfigPath` - Pushed when config path is resolved or changes
- `bbj/configReloadRequired` - Pushed when config.bbx has changed on disk (prompts client restart)

**Diagnostic Notifications:**
- `textDocument/publishDiagnostics` - LSP standard; sent after parse, linking, validation
- Cascading suppression: if parse errors exist, downstream validation errors are hidden

**Refresh Requests:**
- `inlayHint/refresh` - Request client refresh inlay hints (parameter names) after Java classes load
- `codeLens/refresh` - Request client refresh code lenses (composer UI cues)

**Workspace Notifications:**
- `window/showErrorMessage` - User-facing errors (bbjcpl unavailable, Java interop failure)
- `window/showInformationMessage` - Confirmations (Java classes refreshed, config reloaded)

## Error Recovery

**Java Interop Circuit Breaker (P61-D3-001):**
- State machine: closed → half-open → open → half-open → closed
- Initial cooldown: 5 seconds (`INTEROP_BREAKER_INITIAL_COOLDOWN_MS = 5_000`), backoff factor: 2× (`INTEROP_BREAKER_BACKOFF_FACTOR = 2`), max: 30 seconds (`INTEROP_BREAKER_MAX_COOLDOWN_MS = 30_000`)
- Behavior:
  - **Closed**: Requests proceed normally
  - **Open**: Requests fail immediately with "circuit open" error
  - **Half-open**: One probe per cooldown window; if it succeeds, transition to closed and notify recovery listeners
  - On recovery: silent re-validation (no popup), implicit imports reloaded, documents re-checked
- Implementation: `CircuitBreaker` class in `bbj-vscode/src/language/java-interop.ts`

**Transport Failure Classification:**
- `InteropTransportError` - Transport-level failure (breaker short-circuit, failed connect, timeout); MUST NOT be cached as "class not found"
- `ConnectionError` (vscode-jsonrpc) - Connection transport failure
- `ResponseError` with `ErrorCodes.PendingResponseRejected` - Dropped connection rejecting in-flight requests
- Helper: `isInteropTransportFailure()` function in `java-interop.ts`

**Compile Timeout:**
- bbjcpl process killed after 30 seconds (configurable)
- Returns empty diagnostics array; logs warning
- Safe cancellation: `CompileHandle.cancel()` checks PID validity before sending SIGKILL

**Config File Issues:**
- If config file not found: uses BBj home defaults, logs warning
- If config parsing fails: falls back to computed classpath

## Dependency Management

**Automated Updates (Dependabot):**
- **npm (bbj-vscode)**: Weekly schedule
  - Ignored: `chevrotain` (pinned to Langium version — manual updates only with Langium upgrades)
  - Ignored: TypeScript major versions (gated by typescript-eslint support, which currently supports TS 4.8.4–6.0.x)
  - Configuration: `.github/dependabot.yml`

- **Gradle (bbj-intellij)**: Weekly schedule
  - Wrapper version updates allowed but checked by `.github/workflows/workflow-hygiene.yml`
  - Check validates wrapper checksums are recorded in `check-gradle-wrapper.mjs` allowlist
  - Configuration: `.github/dependabot.yml`

---

*Integration audit: 2026-09-28*
