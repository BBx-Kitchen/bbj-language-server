# IntelliJ LSP Plugin Pitfalls

**Research Type:** Project Research — Pitfalls
**Dimension:** IntelliJ LSP plugins via LSP4IJ
**Context:** Adding IntelliJ support to BBj Language Server
**Date:** 2026-02-01

---

## Critical Mistakes & Common Pitfalls

### 1. Process Lifecycle Management

#### 1.1 Language Server Process Crashes Not Handled

**What goes wrong:**
- Language server crashes silently, leaving IntelliJ UI in broken state
- No automatic restart mechanism — users see no diagnostics, no completions
- Error states accumulate (e.g., "connection refused" floods logs)
- IntelliJ doesn't detect LS death until next LSP request fails

**Warning signs:**
- Users report "features stopped working mid-session"
- Logs show socket/connection errors without recovery attempts
- Manual IDE restart required to restore functionality
- No error notifications when LS process terminates

**Prevention:**
- Implement process health monitoring (heartbeat/watchdog)
- Add automatic restart with exponential backoff (max 3 attempts)
- Surface LS crash notifications to user via IntelliJ balloon notifications
- Log process exit codes and stderr for debugging
- Add "Restart Language Server" action in Tools menu

**Phase:** P1 (LS Process Management) — Must have before alpha

**Related code patterns:**
```java
// Anti-pattern: fire and forget
ProcessBuilder pb = new ProcessBuilder("node", lsPath);
process = pb.start();

// Better: monitor and restart
process.onExit().thenAccept(this::handleProcessExit);
```

---

#### 1.2 Zombie Processes on IntelliJ Shutdown

**What goes wrong:**
- LS and java-interop processes outlive IntelliJ
- Ports 5008 remain occupied, preventing next IntelliJ session from starting
- Multiple orphaned Node.js processes accumulate over days
- Users resort to `killall java` or `killall node`

**Warning signs:**
- Port binding errors on IntelliJ restart
- Activity Monitor shows multiple `node` processes with same arguments
- java-interop fails to start with "address already in use"
- macOS "force quit" dialogs for background processes

**Prevention:**
- Register shutdown hooks in plugin's `dispose()` method
- Destroy process trees (parent + children) using `Process.descendants()`
- Set timeout for graceful shutdown (2s), then force kill
- Use process groups to ensure child processes (java-interop spawned by LS) also terminate
- Consider using `--parent-pid` flag pattern for child processes

**Phase:** P1 (LS Process Management) — Blocks alpha deployment

**Related issues:**
- Java's `Process.destroy()` may not kill child processes
- Node.js child processes inherit stdio, preventing parent termination
- IntelliJ's `Disposer` runs shutdown hooks asynchronously

---

#### 1.3 Race Conditions on IDE Startup

**What goes wrong:**
- IntelliJ opens BBj files before LS finishes initializing
- Requests sent to LS before `initialize` handshake completes
- LS rejects requests with "server not initialized" errors
- Users see "syntax highlighting works but no completions"

**Warning signs:**
- First file opened shows errors, second file works fine
- Logs show LSP requests before `initialized` notification
- Diagnostics appear 5-10 seconds after file opens
- Random failures during cold start, but not after LS restart

**Prevention:**
- Queue LSP requests until LS sends `initialized` notification
- Show "Starting BBj Language Server..." progress indicator
- Block file analysis until LS reports ready state
- Add timeout (30s) for initialization with user-facing error

**Phase:** P1 (LS Process Management)

---

### 2. Transport and Communication

#### 2.1 IPC vs Stdio Transport Mismatch

**What goes wrong:**
- VS Code extension uses IPC (`TransportKind.ipc`)
- IntelliJ/LSP4IJ expects stdio communication
- LS starts but never receives requests (wrong pipe/socket)
- No error messages because LS is waiting on wrong transport

**Warning signs:**
- LS process runs (visible in Activity Monitor) but IntelliJ shows "disconnected"
- No logs from LS, suggesting it's not receiving data
- Works in VS Code but completely broken in IntelliJ
- `main.cjs` unchanged from VS Code bundle

**Prevention:**
- Verify `createConnection(ProposedFeatures.all)` defaults to stdio
- Test standalone: `node main.cjs` should accept stdin/stdout
- LSP4IJ uses `ProcessBuilder` redirecting stdin/stdout — ensure LS expects this
- Add integration test: send JSON-RPC message via stdin, verify stdout response

**Phase:** P0 (Project Setup) — Must validate during initial spike

**Critical check:**
```bash
# Test LS stdio transport manually
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | node main.cjs
# Should see JSON response on stdout
```

---

#### 2.2 JSON-RPC Message Framing Issues

**What goes wrong:**
- LS expects Content-Length headers, IntelliJ sends raw JSON
- Or vice versa: IntelliJ sends headers, LS doesn't parse them
- Messages split across multiple reads/writes
- Binary data (UTF-16 characters) corrupts JSON parsing

**Warning signs:**
- "Unexpected token" JSON parse errors in logs
- Messages work for ASCII content but fail with emojis/unicode
- First request succeeds, subsequent requests hang
- LS logs show partial JSON messages

**Prevention:**
- Use Langium's built-in `createConnection()` — handles framing automatically
- Verify LSP4IJ uses standard LSP message format (Content-Length headers)
- Test with multi-byte Unicode characters in BBj source files
- Log raw bytes during development to debug framing issues

**Phase:** P0 (Project Setup) — Validate before building features

---

#### 2.3 java-interop Connection Failures

**What goes wrong:**
- LS expects java-interop on localhost:5008 but it's not running
- java-interop starts after LS, but LS already failed connection attempts
- Firewall/security software blocks localhost:5008
- Port 5008 occupied by previous crashed instance

**Warning signs:**
- Java completions never work, BBj completions work fine
- Logs show "ECONNREFUSED 127.0.0.1:5008"
- Works after manual java-interop start, but not on plugin activation
- macOS prompts "Do you want the application to accept incoming connections?"

**Prevention:**
- Start java-interop BEFORE starting LS
- Add readiness check: poll port 5008 until accepting connections
- LS should retry java-interop connection with exponential backoff
- Surface java-interop status in IntelliJ UI (status bar widget)
- Allow users to manually restart java-interop via action

**Phase:** P2 (java-interop Integration) — Critical for Java completions

**Implementation order:**
1. Start java-interop process
2. Wait for port 5008 to accept connections (max 10s)
3. Start LS with confidence java-interop is ready
4. Monitor both processes independently

---

### 3. Configuration and Settings

#### 3.1 BBj Home Path Not Reaching Language Server

**What goes wrong:**
- User configures BBj home in IntelliJ settings UI
- LS never receives the setting update
- java-interop needs classpath but gets empty array
- Completions fail because BBj JARs not on classpath

**Warning signs:**
- Settings UI shows correct path, but LS logs show "BBj home: undefined"
- Java completions missing BBj-specific classes
- Works when BBj home hardcoded in LS, fails with dynamic config
- No workspace/didChangeConfiguration notifications in LSP trace

**Prevention:**
- Send `workspace/didChangeConfiguration` notification on settings change
- Include BBj settings in LS initialization params
- Add "Reload Language Server" action that restarts with fresh config
- Log received configuration in LS for debugging
- Validate BBj home path exists before sending to LS

**Phase:** P2 (Settings & Configuration)

**LSP flow:**
```
User changes setting → IntelliJ settings persist
→ LSP client sends workspace/didChangeConfiguration
→ LS receives, validates, applies config
→ LS notifies java-interop of classpath update
```

---

#### 3.2 Configuration Schema Mismatch

**What goes wrong:**
- VS Code extension expects `bbj.bbjHome`, IntelliJ sends `bbjHome`
- LS can't parse settings because structure differs
- Nested settings (e.g., `bbj.compiler.options`) flattened incorrectly
- Environment-specific defaults (paths) break cross-platform

**Warning signs:**
- Settings appear in IntelliJ but LS uses defaults
- Logs show "Unknown configuration key: bbjHome"
- Works on macOS dev machine, broken on Windows CI
- LS expects object, receives array (or vice versa)

**Prevention:**
- Document exact JSON schema LS expects for configuration
- Use consistent naming: if LS expects `bbj.bbjHome`, IntelliJ must send that
- Add configuration validation/schema checking in plugin
- Test on Windows/macOS/Linux with different path styles

**Phase:** P2 (Settings & Configuration)

---

#### 3.3 Runtime Bundling Assumptions

**What goes wrong:**
- Plugin assumes Node.js installed globally
- Users without Node.js see cryptic "command not found" errors
- Different Node.js versions (14 vs 16 vs 18) have incompatible APIs
- Bundled Node.js binary not executable (permissions, code signing)

**Warning signs:**
- Works for developers (who have Node.js) but fails for QA/users
- macOS Gatekeeper blocks bundled Node.js: "unidentified developer"
- Linux AppArmor/SELinux prevents execution
- Plugin size bloated (100MB+) from bundled runtimes

**Prevention:**
- EITHER bundle Node.js runtime (increases plugin size, avoid code signing issues)
- OR require Node.js as dependency with clear setup instructions
- Detect Node.js version before starting LS: `node --version`
- Show actionable error: "BBj plugin requires Node.js 16+. Install from nodejs.org"
- Document minimum Node.js version in plugin description

**Phase:** P3 (Distribution & Packaging) — Decide early, implement for beta

**Decision needed:**
- Bundled runtime: easier for users, harder to maintain, larger download
- System Node.js: smaller plugin, but dependency management burden

---

### 4. Feature Coverage and Compatibility

#### 4.1 LSP4IJ Feature Coverage Gaps

**What goes wrong:**
- LS implements LSP 3.17 features (e.g., semantic tokens, inline hints)
- LSP4IJ only supports LSP 3.16 subset
- Features silently ignored, users wonder why IntelliJ missing features VS Code has
- No documentation of LSP4IJ's supported feature set

**Warning signs:**
- Semantic tokens work in VS Code, not in IntelliJ
- Inlay hints/code lenses missing despite LS sending them
- LSP trace shows LS sending data, IntelliJ not rendering
- Features work in other LSP4IJ plugins (proving support exists)

**Prevention:**
- Audit LSP4IJ source to list supported capabilities
- Compare against LS's reported capabilities in `initialize` response
- Document feature parity gaps between VS Code and IntelliJ
- Consider contributing missing features to LSP4IJ upstream
- Set user expectations: README lists IntelliJ limitations

**Phase:** P0 (Research) — Before committing to LSP4IJ approach

**Research tasks:**
- Check LSP4IJ GitHub for open issues about missing features
- Test reference implementations (e.g., Quarkus plugin)
- Contact LSP4IJ maintainers about roadmap

---

#### 4.2 TextMate Grammar Compatibility

**What goes wrong:**
- VS Code uses `bbj.tmLanguage.json` for syntax highlighting
- IntelliJ's TextMate bundle implementation differs subtly
- Regex patterns work in VS Code, fail in IntelliJ
- Scopes mapped differently (e.g., `keyword.control.bbj` → unknown)

**Warning signs:**
- Syntax highlighting broken or inconsistent
- Some keywords highlighted, others plain text
- Comments not colored correctly
- String literals containing code not escaped properly

**Prevention:**
- Test TextMate grammar in IntelliJ early (P0 spike)
- Compare IntelliJ's TextMate vs VS Code's TextMate
- Fall back to LSP semantic tokens if TextMate incompatible
- Document which approach provides syntax highlighting
- Consider generating IntelliJ lexer if TextMate fails

**Phase:** P1 (Syntax Highlighting) — Critical for usability

**Fallback plan:**
- If TextMate broken: use LSP semantic tokens (slower but universal)
- If semantic tokens inadequate: write IntelliJ custom lexer (weeks of work)

---

#### 4.3 File Type Registration Conflicts

**What goes wrong:**
- Multiple plugins claim `.bbj` extension
- IntelliJ uses wrong plugin/parser for BBj files
- File icons wrong (shows generic text file icon)
- "Open in Editor" uses plaintext instead of BBj plugin

**Warning signs:**
- BBj files open without syntax highlighting
- Logs show "No file type registered for .bbj"
- Other plugins (e.g., custom syntax highlighter) interfere
- Works on clean IntelliJ install, breaks with user's existing plugins

**Prevention:**
- Register file types early in plugin initialization
- Claim all BBj extensions: `.bbj`, `.bbl`, `.bbjt`, `.src`
- Set file icon to distinguish from plaintext
- Test in IntelliJ instance with other language plugins installed

**Phase:** P1 (File Type Registration)

---

### 5. Performance and Resource Management

#### 5.1 Language Server Startup Latency

**What goes wrong:**
- Node.js LS takes 5-10 seconds to start
- IntelliJ freezes waiting for LS during project open
- Users perceive IntelliJ as "hanging" or "slow"
- Timeout errors if LS startup exceeds IntelliJ's expectations

**Warning signs:**
- "Unresponsive plugin" warnings from IntelliJ
- Progress bar stuck at "Initializing BBj Language Server..."
- LS works eventually but UX feels sluggish
- Multiple LS instances spawned because IntelliJ retries

**Prevention:**
- Start LS asynchronously without blocking UI thread
- Show progress notification with "Starting BBj Language Server..."
- Pre-warm LS during IntelliJ startup (background task)
- Optimize LS bundle size (tree-shake unused dependencies)
- Consider lazy initialization: start LS only when BBj file opened

**Phase:** P3 (Performance Optimization) — Polish for beta

---

#### 5.2 Memory Leaks from Unreleased Resources

**What goes wrong:**
- Process handles not closed on LS restart
- Socket connections accumulate
- File watchers never disposed
- IntelliJ heap grows unbounded over days

**Warning signs:**
- IntelliJ memory usage grows from 500MB → 4GB over time
- "Out of memory" errors after extended use
- Leak detector warnings in IntelliJ logs
- Performance degrades after multiple LS restarts

**Prevention:**
- Call `process.destroy()` in plugin's `dispose()` method
- Close all streams (stdin/stdout/stderr readers)
- Dispose LSP client connection explicitly
- Use IntelliJ's `Disposer.register()` for automatic cleanup
- Test: repeatedly restart LS, check heap dumps for retained objects

**Phase:** P2 (Stability) — Before beta

---

#### 5.3 File Watcher Overload

**What goes wrong:**
- LS watches entire BBj project directory recursively
- Large projects (1000s of files) trigger watch limit
- Each file change triggers full re-analysis
- IntelliJ + LS + java-interop all watching same files (redundant)

**Warning signs:**
- "Too many open files" errors on macOS/Linux
- High CPU usage when saving files
- Slowdowns in large BBj projects
- Logs show file change events flooding LS

**Prevention:**
- Use IntelliJ's built-in file watcher, forward to LS
- Don't let LS watch filesystem directly (IntelliJ handles this)
- Configure watch exclusions: `node_modules`, `.git`, `out/`, etc.
- Debounce file change notifications (batch rapid changes)

**Phase:** P2 (Performance) — Important for large projects

---

### 6. Error Handling and Diagnostics

#### 6.1 Silent Failures with No User Feedback

**What goes wrong:**
- LS crashes, user sees nothing
- java-interop connection fails, completions silently broken
- Configuration errors logged but user unaware
- Users report "doesn't work" with no actionable details

**Warning signs:**
- Bug reports: "Java completions missing" with no logs attached
- Users unaware LS crashed, just see missing features
- No visible error notifications
- Support burden: asking users to check logs

**Prevention:**
- Show balloon notifications for critical errors
- Add status bar widget: "BBj LS: Running" (green) vs "Disconnected" (red)
- Log errors with actionable messages: "Start failed: Node.js not found. Install Node.js 16+"
- Provide "Report Issue" action that collects logs automatically

**Phase:** P1 (Error Handling) — Essential for alpha

---

#### 6.2 Cascading Failures from java-interop

**What goes wrong:**
- java-interop crashes, LS keeps running
- LS repeatedly tries to reconnect to dead java-interop
- LS logs flooded with connection errors
- User sees Java completions stop working mid-session

**Warning signs:**
- Logs show hundreds of "ECONNREFUSED" errors
- LS still provides BBj completions, but no Java completions
- CPU usage spikes from connection retry loop
- java-interop port unbound (lsof shows nothing on 5008)

**Prevention:**
- Circuit breaker pattern: stop retrying after N failures
- Surface java-interop status separately from LS status
- Allow manual java-interop restart without restarting LS
- Degrade gracefully: BBj completions still work, Java completions disabled

**Phase:** P2 (java-interop Integration)

---

### 7. Testing and Validation

#### 7.1 No Integration Tests for Multi-Process Startup

**What goes wrong:**
- Plugin starts LS and java-interop in specific order
- Race conditions only appear in integration, not unit tests
- Manual testing misses edge cases (LS crash during init, etc.)
- Refactors break startup sequence, caught in production

**Warning signs:**
- Works in dev testing, fails for QA
- Intermittent failures: "works 80% of the time"
- No automated test for process lifecycle
- Releases regress previously working behavior

**Prevention:**
- Write integration test: start IntelliJ, open BBj file, verify completions
- Test failure scenarios: LS crashes, java-interop missing, Node.js not found
- Automate in CI: spin up IntelliJ headless, run plugin, assert behavior
- Use IntelliJ's plugin testing framework

**Phase:** P2 (Testing) — Before beta

---

#### 7.2 Platform-Specific Assumptions

**What goes wrong:**
- Plugin works on macOS dev machines, broken on Windows
- Path separators hardcoded: `/` vs `\`
- Process spawning differs: Windows needs `.cmd` wrappers
- File permissions issues on Linux (bundled binaries not +x)

**Warning signs:**
- GitHub issues: "doesn't work on Windows"
- Paths with spaces fail on Windows: `C:\Program Files\BBj`
- Tests pass on macOS CI, fail on Windows CI
- Demo works on developer laptop, fails on customer machines

**Prevention:**
- Test on all platforms: macOS, Windows, Linux
- Use Java's `Path` API for platform-agnostic paths
- Test with paths containing spaces and special characters
- CI matrix: run tests on Windows/macOS/Linux

**Phase:** P2 (Cross-Platform) — Before beta

---

### 8. IntelliJ-Specific Pitfalls

#### 8.1 Community vs Ultimate Edition Differences

**What goes wrong:**
- Plugin accidentally uses Ultimate-only APIs
- Works in dev (Ultimate) but crashes in Community Edition
- Users see "Plugin incompatible" errors
- LSP features work differently between editions

**Warning signs:**
- `NoClassDefFoundError` for Ultimate-only classes
- Plugin descriptor declares Ultimate dependency
- Feature works for some users, not others
- LSP4IJ behaves differently in Community vs Ultimate

**Prevention:**
- Develop and test in IntelliJ Community Edition
- Declare `<idea-version since-build="..." until-build="..."/>` carefully
- Avoid imports from `com.intellij.ultimate.*`
- CI testing in both Community and Ultimate

**Phase:** P0 (Project Setup) — Verify LSP4IJ Community compatibility

---

#### 8.2 IntelliJ Version Compatibility Range

**What goes wrong:**
- Plugin targets IntelliJ 2024.1, users run 2023.3
- APIs changed between versions, runtime errors
- "until-build" too restrictive, blocks updates
- Breaking changes in IntelliJ 2024.2 break plugin

**Warning signs:**
- Users report "Plugin incompatible with IDE build"
- Works in IntelliJ 2024.1, crashes in 2024.2
- Can't update IntelliJ without losing BBj support
- Method signatures changed, compilation fails

**Prevention:**
- Target widest version range possible (e.g., 2023.3+)
- Test plugin on oldest and newest supported versions
- Monitor IntelliJ API changes, adapt proactively
- Conservative "until-build": leave open unless known incompatibility

**Phase:** P3 (Distribution) — Define before publishing

---

#### 8.3 Plugin Conflicts and Load Order

**What goes wrong:**
- Another plugin also provides BBj support (conflicting)
- Plugins load in undefined order, race conditions
- Extension points overwritten by last-loaded plugin
- LSP4IJ loaded after BBj plugin, services unavailable

**Warning signs:**
- Works in isolation, broken with other plugins installed
- File type associated with wrong plugin
- "Duplicate service registration" errors
- Depends on plugin load order (non-deterministic)

**Prevention:**
- Declare dependencies in plugin.xml: `<depends>com.redhat.devtools.lsp4ij</depends>`
- Use unique IDs for file types, services, actions
- Test with common plugins installed (Lombok, Gradle, etc.)
- Document known incompatibilities in README

**Phase:** P2 (Integration) — Before beta

---

## Summary: Most Critical Pitfalls by Phase

### P0 (Project Setup & Validation)
1. **IPC vs stdio transport mismatch** — test immediately
2. **LSP4IJ feature coverage gaps** — research before committing
3. **Community Edition compatibility** — verify LSP4IJ works

### P1 (Core Functionality)
1. **LS process crash handling** — must restart automatically
2. **Zombie processes on shutdown** — must clean up reliably
3. **Silent failures** — must surface errors to users
4. **Startup race conditions** — queue requests until LS ready

### P2 (Integration & Stability)
1. **BBj home path not reaching LS** — settings synchronization
2. **java-interop connection failures** — start before LS, monitor health
3. **Cascading failures** — degrade gracefully when java-interop dies
4. **Cross-platform testing** — Windows/macOS/Linux

### P3 (Distribution & Polish)
1. **Node.js bundling decision** — bundle vs require system Node.js
2. **IntelliJ version compatibility** — define supported range
3. **Performance optimization** — async startup, lazy initialization

---

## Decision Points Requiring Early Resolution

1. **Transport mechanism:** Confirm LS supports stdio (not just IPC)
2. **Process management:** Who starts java-interop? Plugin or LS?
3. **Node.js bundling:** Bundle runtime or require system install?
4. **Syntax highlighting:** TextMate vs LSP semantic tokens vs custom lexer?
5. **Settings schema:** Align IntelliJ settings format with LS expectations

---

**Research completed:** 2026-02-01
**Next steps:** Prioritize pitfalls by phase, integrate into roadmap tasks
