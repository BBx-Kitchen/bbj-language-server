# Phase 31: Extension Settings & File Types - Research

**Researched:** 2026-02-07
**Domain:** IDE extension configuration, file type registration, secure credential storage
**Confidence:** HIGH

## Summary

This phase adds .bbx file support (treating them identically to .bbj files) and makes BBj extension settings configurable in both VS Code and IntelliJ IDEA. The research confirms that both IDEs provide mature APIs for hot-reloadable settings, secure credential storage, and file type registration with multiple extensions.

Key findings:
- VS Code and IntelliJ both support workspace/user settings with clear precedence (workspace overrides user)
- Both platforms provide secure credential storage APIs (VS Code SecretStorage, IntelliJ CredentialStore) that use OS-native keychains
- File type registration for multiple extensions is straightforward in both platforms
- Configuration hot reload is already implemented in the BBj language server via `onDidChangeConfiguration`
- The codebase already has hardcoded localhost:5008 for java-interop connection — needs to become configurable

**Primary recommendation:** Use existing LSP `didChangeConfiguration` mechanism for hot reload, OS-native credential storage for JWT tokens, and validate settings on first use (lazy validation) rather than on save to avoid blocking the settings UI.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- .bbx files behave 100% identically to .bbj — same icon, same diagnostics, same completion, same run commands
- Only adding .bbx — no other new extensions
- Same BBj icon for .bbx (no distinct variant)
- Support in both VS Code and IntelliJ
- Settings support both workspace-level and user-level, with workspace overriding user defaults
- Configurable settings: BBj Home, classpath (existing), interop host/port (new), EM URL and auth token (new)
- Changing settings takes effect immediately (hot reload) — no server restart required
- IntelliJ: add new settings fields to the existing Languages & Frameworks > BBj page (same page, no sub-sections)
- Use case: shared team servers AND remote dev environments (SSH, containers, CI)
- Plain TCP connection — no SSL/TLS (rely on network-level security like VPN/SSH tunnels)
- Default to localhost:5008 when no settings configured — works out of the box for local dev
- Retry connection periodically when remote server is unreachable, notify user of connection status
- BBj Admin API provides JWT — develop a BBj stub program (similar to DWC launcher) that shows a user login dialog and returns the JWT
- Login trigger: both explicit command ("BBj: Login to EM" / menu action) AND auto-prompt on first EM access if not logged in
- Token expiry: re-prompt the BBj login dialog to get a fresh JWT (no silent refresh)

### Claude's Discretion
- JWT secure storage implementation per IDE
- Retry interval and backoff strategy for remote interop connection
- Settings validation approach (on save vs on use)
- Hot reload implementation details

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| VS Code API | 1.67.0+ | Extension settings, SecretStorage, file types | Official VS Code extension API |
| IntelliJ Platform SDK | 2024.1+ | PersistentStateComponent, CredentialStore, FileType | Official IntelliJ plugin API |
| vscode-languageclient | 9.0.1 | LSP client with configuration sync | Current project dependency |
| Langium | 4.1.3 | Language server with didChangeConfiguration support | Current project dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js net.Socket | Built-in | TCP socket connections with retry | For java-interop connection management |
| VS Code workspace API | Built-in | Multi-root workspace, configuration scopes | For workspace vs user settings |
| IntelliJ PersistentStateComponent | Built-in | Application-level settings persistence | For global IntelliJ settings storage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OS-native keychain | Plain text settings | Native keychain is more secure but requires platform-specific code (VS Code/IntelliJ APIs abstract this) |
| Eager validation (on save) | Lazy validation (on use) | Eager catches errors sooner but blocks settings UI and complicates UX |
| Custom settings UI | Built-in settings editors | Custom UI offers more control but built-in editors are free, consistent, and accessible |

**Installation:**
No new dependencies required — all APIs are part of existing VS Code and IntelliJ Platform SDKs.

## Architecture Patterns

### Recommended Project Structure
```
bbj-vscode/
├── src/
│   ├── extension.ts              # Register .bbx, commands, SecretStorage
│   ├── language/
│   │   ├── main.ts               # onDidChangeConfiguration handler (already exists)
│   │   └── java-interop.ts       # Update to use configurable host/port
│   └── Commands/
│       └── EMLogin.ts            # New: BBj login stub launcher
bbj-intellij/
├── src/main/java/com/basis/bbj/intellij/
│   ├── BbjFileType.java          # Update extensions to include .bbx
│   ├── BbjSettings.java          # Add EM URL, host, port fields
│   ├── BbjSettingsComponent.java # Add UI fields for new settings
│   └── actions/
│       └── BbjEMLoginAction.java # New: Login to EM action
```

### Pattern 1: File Type Registration with Multiple Extensions

**What:** Register multiple file extensions that share the same language treatment

**When to use:** When different file extensions (e.g., .bbj and .bbx) should have identical language features

**VS Code Example:**
```typescript
// package.json
{
  "contributes": {
    "languages": [{
      "id": "bbj",
      "extensions": [".bbj", ".bbl", ".bbjt", ".src", ".bbx"],  // Add .bbx here
      "icon": {
        "light": "./images/bbj-file-light.svg",
        "dark": "./images/bbj-file-dark.svg"
      }
    }]
  }
}
```

**IntelliJ Example:**
```xml
<!-- plugin.xml -->
<fileType
    name="BBj"
    implementationClass="com.basis.bbj.intellij.BbjFileType"
    fieldName="INSTANCE"
    language="BBj"
    extensions="bbj;bbl;bbjt;src;bbx"/>  <!-- Add bbx here -->
```

**Key insight:** Current codebase has a separate BbxConfigFileType for .bbx with a different icon. Phase 31 requires merging .bbx into the main BBj file type to ensure identical treatment.

### Pattern 2: Configuration Hot Reload via LSP didChangeConfiguration

**What:** Propagate VS Code/IntelliJ settings changes to the language server without restart

**When to use:** When configuration changes should take effect immediately (e.g., classpath, connection settings)

**Example (VS Code):**
```typescript
// extension.ts - already partially implemented
const clientOptions: LanguageClientOptions = {
  synchronize: {
    configurationSection: 'bbj'  // Auto-sync bbj.* settings
  }
};

// language/main.ts - already exists
connection.onDidChangeConfiguration(async (change) => {
  // 1. Update Langium's internal state
  shared.workspace.ConfigurationProvider.updateConfiguration(change);

  // 2. Reload affected services (e.g., java-interop connection)
  const settings = getSettings();
  javaInterop.reconnect(settings.interopHost, settings.interopPort);

  // 3. Re-validate all documents if needed
  await revalidateAllDocuments();
});
```

**IntelliJ Example:**
```java
// BbjLanguageServerFactory.java
@Override
public void settingsChanged() {
    // IntelliJ LSP4J triggers restart by default
    // For hot reload, send custom workspace/didChangeConfiguration
    LanguageServer server = getLanguageServer();
    if (server != null) {
        DidChangeConfigurationParams params = new DidChangeConfigurationParams(
            Map.of("bbj", BbjSettings.getInstance().getState())
        );
        server.getWorkspaceService().didChangeConfiguration(params);
    }
}
```

**Key insight:** The BBj language server already handles `onDidChangeConfiguration` for classpath changes. Extend this handler to also update java-interop connection settings.

### Pattern 3: Secure Credential Storage

**What:** Store sensitive tokens (JWT) in OS-native secure storage instead of plain settings

**When to use:** Storing authentication tokens, passwords, API keys

**VS Code Example:**
```typescript
// extension.ts
export async function activate(context: vscode.ExtensionContext) {
  const secretStorage = context.secrets;

  // Store JWT
  await secretStorage.store('bbj.emToken', jwtToken);

  // Retrieve JWT
  const token = await secretStorage.get('bbj.emToken');

  // Delete JWT
  await secretStorage.delete('bbj.emToken');
}
```

**IntelliJ Example:**
```java
// EMLoginAction.java
import com.intellij.credentialStore.CredentialAttributes;
import com.intellij.ide.passwordSafe.PasswordSafe;

public class BbjEMLoginAction extends AnAction {
    private static final String SERVICE_NAME = "BBj Enterprise Manager";

    public void storeToken(String emUrl, String token) {
        CredentialAttributes attrs = new CredentialAttributes(
            SERVICE_NAME,
            emUrl,  // username = EM URL
            this.getClass(),
            false
        );
        PasswordSafe.getInstance().setPassword(attrs, token);
    }

    public String getToken(String emUrl) {
        CredentialAttributes attrs = new CredentialAttributes(
            SERVICE_NAME,
            emUrl,
            this.getClass(),
            false
        );
        return PasswordSafe.getInstance().getPassword(attrs);
    }
}
```

**Key insight:** Both platforms use OS-native secure storage (macOS Keychain, Windows Credential Manager, Linux Keyring). Store JWT keyed by EM URL to support multiple EM instances.

### Pattern 4: Connection Retry with Exponential Backoff

**What:** Retry failed TCP connections with increasing delays and jitter

**When to use:** Connecting to remote services that may be temporarily unavailable

**Example:**
```typescript
// java-interop.ts
class JavaInteropService {
  private reconnectAttempt = 0;
  private maxReconnectAttempt = 10;
  private reconnectTimer?: NodeJS.Timeout;

  async connect(host: string, port: number): Promise<MessageConnection> {
    try {
      const socket = await this.createSocket(host, port);
      this.reconnectAttempt = 0;  // Reset on success
      return createMessageConnection(
        new SocketMessageReader(socket),
        new SocketMessageWriter(socket)
      );
    } catch (error) {
      // Exponential backoff with jitter: min((2^n + random_ms), max_backoff)
      const baseDelay = Math.pow(2, this.reconnectAttempt) * 1000;
      const jitter = Math.random() * 1000;
      const delay = Math.min(baseDelay + jitter, 32000);  // Cap at 32s

      this.reconnectAttempt++;
      if (this.reconnectAttempt <= this.maxReconnectAttempt) {
        console.log(`Java interop connection failed, retrying in ${delay}ms...`);
        this.reconnectTimer = setTimeout(() => this.connect(host, port), delay);
      } else {
        console.error('Java interop connection failed after max retries');
        // Notify user via status bar or notification
      }
      throw error;
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.connection?.dispose();
    this.connection = undefined;
  }
}
```

**Key insight:** Use capped exponential backoff (max 32s) with jitter to avoid thundering herd. Stop after 10 attempts but allow manual retry via "Refresh Java Classes" command.

### Pattern 5: Lazy Settings Validation (On Use)

**What:** Validate settings when they're first accessed, not when saved

**When to use:** Settings that may reference external resources (paths, URLs, ports)

**Example:**
```typescript
// VS Code: Validation happens when setting is used
async function getJavaInteropConnection(): Promise<MessageConnection> {
  const config = vscode.workspace.getConfiguration('bbj');
  const host = config.get<string>('interop.host') || 'localhost';
  const port = config.get<number>('interop.port') || 5008;

  // Validate on use, not on save
  if (port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${port}. Must be between 1 and 65535.`);
  }

  return javaInterop.connect(host, port);
}
```

**IntelliJ:**
```java
// BbjSettingsComponent.java - already implements this pattern
new ComponentValidator(parentDisposable)
    .withValidator(() -> {
        String text = javaInteropPortField.getText().trim();
        if (text.isEmpty()) {
            return null; // Empty is valid, will use default
        }
        try {
            int port = Integer.parseInt(text);
            if (port < 1 || port > 65535) {
                return new ValidationInfo("Port must be between 1 and 65535");
            }
        } catch (NumberFormatException e) {
            return new ValidationInfo("Port must be a valid number");
        }
        return null;
    })
    .installOn(javaInteropPortField);
```

**Key insight:** IntelliJ already uses lazy validation (ComponentValidator shows errors in real-time but doesn't block). VS Code settings don't have built-in validation UI, so validate in code when the setting is used and show user-friendly error messages.

### Anti-Patterns to Avoid

- **Storing JWT in plain settings:** Security risk. Always use SecretStorage/CredentialStore.
- **Immediate retry on connection failure:** Creates thundering herd if many clients retry at once. Use exponential backoff with jitter.
- **Validating external resources on save:** File paths, URLs, and ports may not exist yet. Validate on use, not on save.
- **Hardcoding connection parameters:** Make host/port configurable to support remote dev environments.
- **Creating separate file type for .bbx:** User wants identical treatment. Merge into BBj file type instead.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secure credential storage | Custom encryption + file storage | VS Code SecretStorage, IntelliJ CredentialStore | Platform APIs use OS-native keychains, handle encryption, key rotation, and permission management |
| Settings UI | Custom Swing/HTML forms | VS Code contributes.configuration, IntelliJ PersistentStateComponent + form builder | Built-in UIs are accessible, searchable, support keyboard shortcuts, and are familiar to users |
| Connection retry logic | Simple setTimeout loop | Exponential backoff with jitter | Prevents thundering herd, adapts to transient vs persistent failures |
| Configuration synchronization | Manual polling or file watchers | LSP workspace/didChangeConfiguration | Standard LSP mechanism, already integrated with VS Code and IntelliJ LSP clients |

**Key insight:** Both VS Code and IntelliJ provide mature APIs that handle cross-platform differences, security, and UX consistency. Use them instead of reinventing these patterns.

## Common Pitfalls

### Pitfall 1: Forgetting to Handle Configuration Scope Precedence

**What goes wrong:** Settings read from wrong scope (user when workspace exists) or written to wrong scope

**Why it happens:** VS Code and IntelliJ have different default scopes. VS Code defaults to user scope, IntelliJ to application scope.

**How to avoid:**
- VS Code: Always specify `ConfigurationTarget.Workspace` when writing workspace-specific settings
- IntelliJ: Use `@State` with appropriate storage location for application vs project settings
- Document which settings are workspace-level vs user-level in the settings descriptions

**Warning signs:**
- Settings changes in one workspace affect other workspaces
- Team members can't share workspace settings via version control

### Pitfall 2: Not Handling Token Expiry Gracefully

**What goes wrong:** Expired JWT causes EM commands to fail with cryptic errors

**Why it happens:** JWTs have expiration times. The extension stores the token but doesn't track expiry.

**How to avoid:**
- Catch authentication errors (401, 403) from EM API calls
- When auth fails, delete the stored token and re-prompt for login
- Show user-friendly error: "Your EM session has expired. Please log in again."

**Warning signs:**
- Commands work initially but fail after hours/days
- Error messages mention "unauthorized" or "invalid token"

### Pitfall 3: Blocking Settings Save with Validation Errors

**What goes wrong:** User can't save settings because a field is temporarily invalid (e.g., remote server is down)

**Why it happens:** Validation happens on save instead of on use

**How to avoid:**
- Use lazy validation: check settings when they're used, not when saved
- For UI feedback, use non-blocking validation (IntelliJ ComponentValidator, VS Code workspace.onDidChangeConfiguration)
- Allow saving invalid values but show warnings/errors when the feature is used

**Warning signs:**
- Users complain settings won't save
- Validation requires network access or file I/O

### Pitfall 4: Not Notifying User of Connection Status

**What goes wrong:** Java interop connection fails silently, features break without explanation

**Why it happens:** Connection happens in background, no UI feedback

**How to avoid:**
- VS Code: Show connection status in status bar (similar to language server status)
- IntelliJ: Already has BbjJavaInteropStatusBarWidget — update it to show connection state
- Show notification on first connection failure, then status bar updates for subsequent retries
- Provide "Refresh Java Classes" command to manually retry connection

**Warning signs:**
- Users report "completion not working" but don't know java-interop is down
- No indication that connection is retrying

### Pitfall 5: Sending Full Configuration on Every Change

**What goes wrong:** Language server receives huge config objects, processes unnecessary updates

**Why it happens:** VS Code `synchronize.configurationSection` sends entire config section on any change

**How to avoid:**
- Use granular configuration keys (bbj.interop.host, bbj.interop.port) instead of nested objects
- In `onDidChangeConfiguration` handler, check which specific settings changed before acting
- Only reload affected services (e.g., only reconnect java-interop if host/port changed)

**Warning signs:**
- Language server logs show frequent config updates
- Unrelated settings changes trigger expensive operations (classpath reload, reconnect)

### Pitfall 6: Race Condition Between Settings Read and Language Server Start

**What goes wrong:** Language server starts with old settings, then receives didChangeConfiguration with same values

**Why it happens:** Extension activates, reads settings, starts server, VS Code sends initial config

**How to avoid:**
- VS Code: Pass settings in `initializationOptions` when starting language client
- Language server: Merge initializationOptions with first didChangeConfiguration
- IntelliJ: LSP4J handles this automatically via `InitializeParams.initializationOptions`

**Warning signs:**
- Language server connects to wrong host on first start
- Settings only take effect after manual restart

## Code Examples

Verified patterns from official sources:

### VS Code: Registering Multiple File Extensions

```typescript
// package.json
{
  "contributes": {
    "languages": [{
      "id": "bbj",
      "aliases": ["BBj", "bbj"],
      "extensions": [".bbj", ".bbl", ".bbjt", ".src", ".bbx"],
      "icon": {
        "light": "./images/bbj-file-light.svg",
        "dark": "./images/bbj-file-dark.svg"
      },
      "configuration": "./bbj-language-configuration.json"
    }]
  }
}
```
Source: [VS Code Language Configuration Guide](https://code.visualstudio.com/api/language-extensions/language-configuration-guide)

### VS Code: Configuration with Workspace/User Scope

```typescript
// package.json
{
  "contributes": {
    "configuration": {
      "type": "object",
      "title": "BBj configuration",
      "properties": {
        "bbj.interop.host": {
          "type": "string",
          "default": "localhost",
          "description": "Java interop service hostname",
          "scope": "window"  // Can be set at user or workspace level
        },
        "bbj.interop.port": {
          "type": "number",
          "default": 5008,
          "description": "Java interop service port",
          "scope": "window"
        },
        "bbj.em.url": {
          "type": "string",
          "default": "",
          "description": "Enterprise Manager URL (e.g., http://localhost:8888)",
          "scope": "window"
        }
      }
    }
  }
}

// extension.ts
const config = vscode.workspace.getConfiguration('bbj');
const host = config.get<string>('interop.host') || 'localhost';

// Write to workspace scope
await config.update('interop.host', 'remote.example.com',
                    vscode.ConfigurationTarget.Workspace);
```
Source: [VS Code Settings](https://code.visualstudio.com/api/ux-guidelines/settings)

### VS Code: SecretStorage for JWT

```typescript
// extension.ts
export async function activate(context: vscode.ExtensionContext) {
  const secrets = context.secrets;

  // Command: Login to EM
  context.subscriptions.push(
    vscode.commands.registerCommand('bbj.loginEM', async () => {
      const config = vscode.workspace.getConfiguration('bbj');
      const emUrl = config.get<string>('em.url');

      if (!emUrl) {
        vscode.window.showErrorMessage('Please set bbj.em.url in settings');
        return;
      }

      // Launch BBj login stub and get JWT
      const jwt = await launchBBjLoginStub(emUrl);

      // Store JWT securely
      await secrets.store(`bbj.em.token.${emUrl}`, jwt);

      vscode.window.showInformationMessage('Successfully logged in to EM');
    })
  );

  // Retrieve JWT when needed
  async function getEMToken(emUrl: string): Promise<string | undefined> {
    return await secrets.get(`bbj.em.token.${emUrl}`);
  }
}
```
Source: [VS Code SecretStorage API](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)

### IntelliJ: FileType with Multiple Extensions

```xml
<!-- plugin.xml -->
<extensions defaultExtensionNs="com.intellij">
  <fileType
      name="BBj"
      implementationClass="com.basis.bbj.intellij.BbjFileType"
      fieldName="INSTANCE"
      language="BBj"
      extensions="bbj;bbl;bbjt;src;bbx"/>
</extensions>
```

```java
// BbjFileType.java
public final class BbjFileType extends LanguageFileType {
    public static final BbjFileType INSTANCE = new BbjFileType();

    @NotNull
    @Override
    public String getDefaultExtension() {
        return "bbj";  // Primary extension
    }
}
```
Source: [IntelliJ Platform FileType Registration](https://plugins.jetbrains.com/docs/intellij/registering-file-type.html)

### IntelliJ: PersistentStateComponent for Settings

```java
// BbjSettings.java - already exists, extend with new fields
@State(
    name = "com.basis.bbj.intellij.BbjSettings",
    storages = @Storage("BbjSettings.xml")
)
public final class BbjSettings implements PersistentStateComponent<BbjSettings.State> {

    public static class State {
        public String bbjHomePath = "";
        public String classpathEntry = "";
        public String javaInteropHost = "localhost";  // NEW
        public int javaInteropPort = 5008;            // Already exists
        public String emUrl = "";                     // NEW
    }

    private State myState = new State();

    @Override
    public State getState() {
        return myState;
    }

    @Override
    public void loadState(@NotNull State state) {
        myState = state;
    }
}
```
Source: [IntelliJ Platform Persisting State](https://plugins.jetbrains.com/docs/intellij/persisting-state-of-components.html)

### IntelliJ: CredentialStore for JWT

```java
// BbjEMLoginAction.java
import com.intellij.credentialStore.CredentialAttributes;
import com.intellij.credentialStore.CredentialAttributesKt;
import com.intellij.credentialStore.Credentials;
import com.intellij.ide.passwordSafe.PasswordSafe;

public class BbjEMLoginAction extends AnAction {
    private static final String SERVICE_NAME = "BBj Enterprise Manager";

    private CredentialAttributes createCredentialAttributes(String emUrl) {
        return new CredentialAttributes(
            CredentialAttributesKt.generateServiceName(SERVICE_NAME, emUrl)
        );
    }

    public void storeToken(String emUrl, String token) {
        CredentialAttributes attrs = createCredentialAttributes(emUrl);
        Credentials credentials = new Credentials(emUrl, token);
        PasswordSafe.getInstance().set(attrs, credentials);
    }

    public String getToken(String emUrl) {
        CredentialAttributes attrs = createCredentialAttributes(emUrl);
        Credentials credentials = PasswordSafe.getInstance().get(attrs);
        return credentials != null ? credentials.getPasswordAsString() : null;
    }

    public void deleteToken(String emUrl) {
        CredentialAttributes attrs = createCredentialAttributes(emUrl);
        PasswordSafe.getInstance().set(attrs, null);
    }
}
```
Source: [IntelliJ Platform Persisting Sensitive Data](https://plugins.jetbrains.com/docs/intellij/persisting-sensitive-data.html)

### Connection Retry with Exponential Backoff

```typescript
// java-interop.ts
class JavaInteropService {
  private reconnectAttempt = 0;
  private maxReconnectAttempt = 10;
  private reconnectTimer?: NodeJS.Timeout;
  private currentHost = 'localhost';
  private currentPort = 5008;

  async connect(host: string, port: number): Promise<MessageConnection> {
    this.currentHost = host;
    this.currentPort = port;

    try {
      const socket = await this.createSocket(host, port, 10000);
      this.reconnectAttempt = 0;  // Reset on success

      const connection = createMessageConnection(
        new SocketMessageReader(socket),
        new SocketMessageWriter(socket)
      );
      connection.listen();
      this.connection = connection;

      // Notify success
      this.notifyConnectionStatus('connected');

      return connection;
    } catch (error) {
      return this.scheduleReconnect(error);
    }
  }

  private scheduleReconnect(error: any): Promise<MessageConnection> {
    // Exponential backoff: min((2^n * 1000) + jitter, 32000)
    const baseDelay = Math.pow(2, this.reconnectAttempt) * 1000;
    const jitter = Math.random() * 1000;
    const delay = Math.min(baseDelay + jitter, 32000);

    this.reconnectAttempt++;

    if (this.reconnectAttempt <= this.maxReconnectAttempt) {
      console.log(
        `Java interop connection failed (attempt ${this.reconnectAttempt}/${this.maxReconnectAttempt}), ` +
        `retrying in ${Math.round(delay / 1000)}s...`
      );

      this.notifyConnectionStatus('retrying', this.reconnectAttempt, delay);

      return new Promise((resolve, reject) => {
        this.reconnectTimer = setTimeout(async () => {
          try {
            const conn = await this.connect(this.currentHost, this.currentPort);
            resolve(conn);
          } catch (e) {
            reject(e);
          }
        }, delay);
      });
    } else {
      console.error('Java interop connection failed after max retries');
      this.notifyConnectionStatus('failed');
      throw error;
    }
  }

  private notifyConnectionStatus(
    status: 'connected' | 'retrying' | 'failed',
    attempt?: number,
    delay?: number
  ): void {
    // VS Code: Update status bar or send notification
    // Implementation depends on extension.ts providing notification mechanism
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.connection?.dispose();
    this.connection = undefined;
    this.reconnectAttempt = 0;
  }
}
```
Source: [AWS Retry with Backoff Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded localhost:5008 | Configurable host/port in settings | Phase 31 | Supports remote dev environments, team servers |
| Plain text EM credentials in settings | JWT in OS-native secure storage | Phase 31 | Improved security, follows platform best practices |
| Separate BbxConfigFileType with different icon | .bbx merged into BBj file type | Phase 31 | .bbx files get full language intelligence |
| Manual restart after settings change | Hot reload via didChangeConfiguration | Already implemented in Phase 30 | Immediate effect of config changes |

**Deprecated/outdated:**
- **VS Code `synchronize.configurationSection`**: Deprecated in vscode-languageclient 8.x+. The recommended approach is for the language server to request configuration via `workspace/configuration` requests. However, the BBj extension can continue using `synchronize.configurationSection` in the near term since it still works and is simpler than implementing pull-based config.
- **IntelliJ 2025.3 EM password storage change**: Before 2025.3, EM passwords stored server-side in plain text. Since 2025.3, stored client-side in native keychain. Phase 31 aligns with this by using CredentialStore for JWT tokens.

## Open Questions

Things that couldn't be fully resolved:

1. **BBj Admin API JWT Endpoint**
   - What we know: BBj Admin API provides JWT tokens, accessed via BBjAdminFactory.getBBjAdmin() with getAuthToken() method
   - What's unclear: Exact API endpoint/method signature for obtaining JWT in the BBj login stub program
   - Recommendation: Consult BBj Admin API javadocs or BASIS Software documentation. Likely pattern: `BBjAdminFactory.getBBjAdmin(host, port, user, pass).getAuthToken()`

2. **JWT Token Lifetime**
   - What we know: JWTs expire after a certain time, requiring re-authentication
   - What's unclear: Default expiration time for BBj Admin API JWTs (minutes? hours? days?)
   - Recommendation: Implement reactive token refresh (catch 401 errors, re-prompt) rather than proactive refresh. Document expected token lifetime for users.

3. **BBj Login Stub Launch Mechanism**
   - What we know: Similar to DWC launcher (web.bbj), shows login dialog, returns JWT
   - What's unclear: Exact BBj process launch command, how to capture return value
   - Recommendation: Research existing DWC launcher implementation in codebase. Likely uses BBj CLI with output capture.

4. **IntelliJ Settings Scope**
   - What we know: Current BbjSettings uses `@Storage("BbjSettings.xml")` which is application-level
   - What's unclear: Whether to support project-level settings in addition to application-level
   - Recommendation: Start with application-level only (matches current implementation). User requirement says "workspace and user level" which maps to VS Code; IntelliJ equivalent is project vs application. Consider adding project-level support in a future phase if users request it.

## Sources

### Primary (HIGH confidence)
- [VS Code Settings API](https://code.visualstudio.com/api/ux-guidelines/settings) - Configuration contribution points
- [VS Code SecretStorage API](https://code.visualstudio.com/api/references/vscode-api#SecretStorage) - Secure credential storage
- [VS Code Language Configuration Guide](https://code.visualstudio.com/api/language-extensions/language-configuration-guide) - File type registration
- [IntelliJ Platform FileType Registration](https://plugins.jetbrains.com/docs/intellij/registering-file-type.html) - Multiple extensions
- [IntelliJ Platform Persisting State](https://plugins.jetbrains.com/docs/intellij/persisting-state-of-components.html) - PersistentStateComponent
- [IntelliJ Platform Persisting Sensitive Data](https://plugins.jetbrains.com/docs/intellij/persisting-sensitive-data.html) - CredentialStore API

### Secondary (MEDIUM confidence)
- [AWS Retry with Backoff Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html) - Exponential backoff best practices
- [BBj User Authentication](https://documentation.basis.cloud/BASISHelp/WebHelp/usr/BBj_Components/BBjServices/bbj_user_authentication.htm) - BBj Admin API overview
- [VS Code didChangeConfiguration Discussion](https://github.com/microsoft/vscode-languageserver-node/issues/620) - Configuration sync patterns
- [IntelliJ Dynamic Plugins](https://plugins.jetbrains.com/docs/intellij/dynamic-plugins.html) - Hot reload capabilities

### Tertiary (LOW confidence - existing codebase patterns)
- Current BBj extension codebase (bbj-vscode/package.json, extension.ts, java-interop.ts)
- Current IntelliJ plugin codebase (BbjSettings.java, BbjSettingsComponent.java, plugin.xml)
- Phase 30 implementation of didChangeConfiguration handler

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are official platform APIs with stable documentation
- Architecture patterns: HIGH - Verified with official docs and existing codebase
- Pitfalls: HIGH - Based on known issues in VS Code/IntelliJ platform development
- BBj Admin API JWT: LOW - Limited public documentation, may need BASIS Software consultation

**Research date:** 2026-02-07
**Valid until:** 60 days (stable APIs, minimal churn expected in VS Code/IntelliJ Platform SDKs)
