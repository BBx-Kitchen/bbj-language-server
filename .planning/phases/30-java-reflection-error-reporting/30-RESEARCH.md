# Phase 30: Java Reflection & Error Reporting - Research

**Researched:** 2026-02-07
**Domain:** Java reflection API, Java method discovery, LSP diagnostics, LSP custom commands
**Confidence:** HIGH

## Summary

This phase addresses two distinct issues: (1) Java reflection not finding recently-added methods like `setSlot()` on BBjControl, and (2) cyclic reference error messages lacking file and line number context. Research reveals that the Java reflection currently uses `getMethods()` which returns all public methods including inherited ones, but default interface methods introduced in Java 8+ may not be properly discovered depending on the reflection approach. The cyclic reference errors come from Langium's default linker but custom error reporting is already partially implemented in the BbjLinker. LSP custom commands exist for other features and can be extended for the refresh command.

**Primary recommendation:** Investigate why default interface methods aren't being discovered by the current reflection approach in InteropService.java. Add LSP RelatedInformation links to cyclic reference diagnostics. Implement a custom LSP command for refreshing Java classes with full cache invalidation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Java reflection — missing methods:**
- The core problem is that certain methods (e.g., `setSlot()`) never arrive from java-interop — not a caching/refresh issue but a discovery issue
- Researcher must investigate WHY methods are missing: classpath issue vs reflection filtering vs something else
- Java source tree available at `/Users/beff/svn/trunk/com` for investigation
- Once found, missing methods should appear in completion with no special treatment — same as existing methods

**Java reflection — refresh mechanism:**
- Re-scan classpath when user changes classpath/config settings
- Add a manual "Refresh Java Classes" command to the command palette in both VS Code AND IntelliJ
- Full invalidation of all cached Java class data on refresh (not selective)
- After refresh, auto re-validate all open documents (re-run diagnostics)
- Show a notification message ("Java classes refreshed") after re-scan completes

**Cyclic reference error reporting:**
- Severity: Error (red)
- Use LSP related information links so users can click to navigate to other files in the cycle
- Researcher should investigate whether other error types beyond cyclic references also lack file/line info

### Claude's Discretion

- Detail level in cyclic reference messages (file+line only vs full cycle path)
- How to structure the refresh command LSP protocol (custom request vs notification)
- Exact notification wording and timing

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Java Reflection API | JDK 11+ | Method/field discovery from compiled classes | Built-in JDK feature, no alternatives needed |
| Langium | 4.x | LSP framework with default linker | Project's core framework |
| LSP Protocol | 3.17+ | Language Server Protocol for diagnostics and commands | Industry standard for editor integration |
| vscode-languageclient | Latest | VS Code LSP client implementation | Official VS Code LSP library |
| com.redhat.devtools.lsp4ij | Latest | IntelliJ LSP client implementation | Standard IntelliJ LSP integration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Guava Reflection | 31+ (already in use) | Enhanced reflection utilities with ClassPath scanning | Already used in InteropService.java |
| vscode-jsonrpc | Latest | JSON-RPC message protocol for LSP | Already used for Java backend communication |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| getMethods() | getDeclaredMethods() | getDeclaredMethods() only returns methods declared directly on the class, not inherited ones — would require recursive parent traversal |
| LSP custom command | Configuration change listener | Commands allow explicit user action; config listeners are passive and harder to debug |
| Full cache invalidation | Selective invalidation | Selective is complex and error-prone; full invalidation is simpler and safer for this use case |

## Architecture Patterns

### Current Java Interop Architecture

The java-interop service uses a socket-based JSON-RPC connection between TypeScript and Java:

```
bbj-vscode (TypeScript)          java-interop (Java)
├─ JavaInteropService.ts    ──►  InteropService.java
│  ├─ getRawClass()               ├─ getClassInfo()
│  ├─ loadClasspath()             ├─ loadClasspath()
│  └─ resolveClass()              └─ getMethods()/getFields()
└─ In-memory cache                BbjClassLoader
   (_resolvedClasses Map)         (URLClassLoader)
```

### Pattern 1: Java Reflection for Interface Methods

**What:** Java's `Class.getMethods()` returns all public methods including inherited interface methods, including default methods from Java 8+.

**When to use:** For discovering all accessible methods on a class or interface.

**Current implementation:**
```java
// From InteropService.java line 183-188
List<Method> methods = Lists.newArrayList(clazz.getMethods());
if (clazz.isInterface()) {
    // add implicit Object declared methods
    methods.addAll(
        Stream.of(Object.class.getMethods()).filter(m -> Modifier.isPublic(m.getModifiers())).toList());
}
```

**Investigation findings:**
- `setSlot()` exists as a default method in BBjControl.java (lines 213-217)
- Default interface methods ARE returned by `getMethods()` (confirmed by Java spec)
- BBjWebManager extends BBjBuiManager which may have complex inheritance
- The issue is likely: (1) class not loaded, (2) classpath not including the JAR, or (3) nested/inner class naming issues

### Pattern 2: LSP Diagnostic Related Information

**What:** LSP DiagnosticRelatedInformation allows linking diagnostics to other locations in the codebase.

**When to use:** For errors that span multiple files (imports, cyclic references, etc.)

**Example structure:**
```typescript
{
  message: "Cyclic reference detected",
  range: { start: { line: 5, character: 10 }, end: { line: 5, character: 20 } },
  severity: DiagnosticSeverity.Error,
  relatedInformation: [
    {
      location: {
        uri: "file:///other-file.bbj",
        range: { start: { line: 10, character: 5 }, end: { line: 10, character: 15 } }
      },
      message: "Reference originates here"
    }
  ]
}
```

**Current state:**
- BbjLinker.createLinkingError() already enhances error messages with source file info (lines 115-123)
- Format: `[in relative/path/to/file.bbj:123]`
- This is TEXT-ONLY, not clickable LSP links
- Langium's default linker throws cyclic reference errors but doesn't populate relatedInformation

### Pattern 3: LSP Custom Commands

**What:** LSP supports custom commands via `workspace/executeCommand` request.

**When to use:** For editor actions that trigger server-side operations (refresh, refactor, code generation).

**VS Code registration pattern:**
```typescript
// Client side (extension.ts)
vscode.commands.registerCommand("bbj.refreshJavaClasses", async () => {
    await client.sendRequest("bbj/refreshJavaClasses");
});

// Server side (main.ts or dedicated handler)
connection.onRequest("bbj/refreshJavaClasses", async () => {
    // Clear cache, reload classpath
    return { success: true };
});
```

**IntelliJ registration pattern:**
```java
// Action class extending AnAction
public class RefreshJavaClassesAction extends AnAction {
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        // Send LSP command to server
        server.sendRequest("bbj/refreshJavaClasses");
    }
}
```

### Anti-Patterns to Avoid

- **Caching without invalidation:** Don't cache Java class data without a way to refresh it
- **Throwing away error context:** Langium's default linker provides minimal error info; always enhance with file/line
- **Synchronous blocking operations:** Java reflection can be slow; use async/timeout patterns (already implemented with 10s timeout)
- **Partial cache invalidation:** For classpath changes, full invalidation is safer than trying to track dependencies

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON-RPC communication | Custom protocol | vscode-jsonrpc (already in use) | Battle-tested, handles framing, cancellation, error propagation |
| Java reflection wrapper | Custom method finder | Java's built-in Class.getMethods() | Handles inheritance, visibility, generics correctly |
| LSP diagnostics aggregation | Custom error collection | Langium's DocumentValidator | Integrates with validation framework, handles ranges properly |
| Classpath scanning | File walker + JAR reader | Guava's ClassPath.from() (already in use) | Handles JAR manifests, nested JARs, URL classloaders |

**Key insight:** Java reflection and LSP protocol are mature, well-specified systems. Custom solutions introduce bugs and maintenance burden.

## Common Pitfalls

### Pitfall 1: Default Interface Methods Not Discovered

**What goes wrong:** Java 8+ default interface methods may not appear in reflection results if the class loader doesn't properly resolve interfaces.

**Why it happens:**
- `getMethods()` traverses the class hierarchy but relies on the class loader to resolve interface types
- If JAR containing interface isn't in classpath, methods from that interface won't appear
- BBjControl is in `com.basis.bbj.proxies.sysgui` package which may be in a separate JAR

**How to avoid:**
- Verify BBj lib directory is fully scanned (currently checks `.lib/*` for BBj 24+)
- Log which JARs are loaded during `loadClasspath()`
- Test with explicit BBjControl class load to verify setSlot() appears

**Warning signs:**
- Some methods from a class appear but others don't
- Methods work in BBj but not in autocomplete
- JARs in BBj home but not showing in java-interop logs

### Pitfall 2: Cyclic Reference Errors Without Context

**What goes wrong:** Langium's default linker reports "Cyclic reference resolution detected" with an AST path like `/statements@0/assignments@0/value/method/member` but no file name or line number.

**Why it happens:**
- Langium's `DefaultLinker.throwCyclicReferenceError()` only includes AST locator path
- Users see the error in console output, not in the Problems panel
- Even when enhanced with file info (as in BbjLinker), it's just appended text, not an LSP link

**How to avoid:**
- Override the linker to catch cyclic reference errors earlier
- Convert to LSP diagnostics with proper range and relatedInformation
- Don't just throw errors; report them through the validation system

**Warning signs:**
- Users report "can't find which file has the error"
- Errors appear in Output tab but not Problems panel
- Error messages have AST paths but no source locations

### Pitfall 3: Cache Invalidation Without Full Relinking

**What goes wrong:** Clearing the Java class cache but not triggering document re-validation leaves stale diagnostics in the editor.

**Why it happens:**
- TypeScript cache (`_resolvedClasses`) can be cleared easily
- But Langium documents have their own linking state
- Diagnostics are computed during validation phase, not linking phase

**How to avoid:**
- After clearing cache, call `workspace.DocumentBuilder.update()` on all open documents
- Set document state back to `DocumentState.Validated` or earlier to force re-linking
- Send `textDocument/publishDiagnostics` notifications to clear stale errors

**Warning signs:**
- After refresh, old autocomplete suggestions persist
- Errors that should be fixed still show red squiggles
- New methods don't appear until file is edited

### Pitfall 4: Missing Timeout on Reflection Operations

**What goes wrong:** Reflection calls to deeply nested or circular class hierarchies can hang indefinitely.

**Why it happens:**
- `Class.forName()` can trigger static initializers
- Complex generics can cause infinite recursion in type resolution
- Network class loaders can hang on unreachable resources

**How to avoid:**
- Already implemented: `getRawClass()` has 10s timeout via `Promise.race()`
- Already implemented: Socket connection has 10s timeout
- Extend timeout pattern to any new reflection operations

**Warning signs:**
- Language server stops responding
- "Code Helper" process uses 100% CPU
- Socket connection errors in logs

## Code Examples

### Example 1: Investigating Missing Methods

To debug why setSlot() isn't appearing, add logging to InteropService.java:

```java
// In loadClassInfo() after line 183
List<Method> methods = Lists.newArrayList(clazz.getMethods());
System.out.println("DEBUG: Found " + methods.size() + " methods for " + className);
for (Method m : methods) {
    if (m.getName().equals("setSlot")) {
        System.out.println("DEBUG: setSlot found! Declaring class: " + m.getDeclaringClass());
    }
}
```

This will show:
1. Whether setSlot is actually returned by getMethods()
2. Which class declares it (BBjControl vs BBjControlFacade)
3. Total method count to verify reflection is working

### Example 2: Enhanced Cyclic Reference Diagnostic

From BbjLinker.ts, current approach only adds text:

```typescript
// Current (line 115-123)
override createLinkingError(refInfo: ReferenceInfo): LinkingError {
    const error = super.createLinkingError(refInfo);
    const sourceInfo = this.getSourceLocation(refInfo);
    if (sourceInfo) {
        error.message = `${error.message} [in ${sourceInfo}]`;
    }
    return error;
}
```

Should instead catch and convert to diagnostic with relatedInformation:

```typescript
// Enhanced approach
protected override throwCyclicReferenceError(node: AstNode, property: string, refText: string): void {
    // Don't throw — convert to diagnostic instead
    const document = AstUtils.getDocument(node);
    const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: getDiagnosticRange({ node, property }),
        message: `Cyclic reference resolution detected for '${refText}'`,
        source: 'bbj',
        relatedInformation: [
            {
                location: {
                    uri: document.uri.toString(),
                    range: getDiagnosticRange({ node, property })
                },
                message: 'Reference cycle starts here'
            }
        ]
    };
    // Add to document diagnostics
}
```

### Example 3: Refresh Command LSP Wire Protocol

TypeScript server handler (add to main.ts or separate service):

```typescript
// Custom request type
const RefreshJavaClassesRequest = new RequestType<void, boolean, void>('bbj/refreshJavaClasses');

// Handler registration
connection.onRequest(RefreshJavaClassesRequest, async () => {
    const javaInterop = services.BBj.java.JavaInteropService;

    // Step 1: Clear TypeScript-side cache
    javaInterop.clearCache(); // Need to add this method

    // Step 2: Reload classpath from config
    const config = await connection.workspace.getConfiguration('bbj');
    await javaInterop.loadClasspath(config.classpath);

    // Step 3: Re-validate all open documents
    const documents = services.shared.workspace.LangiumDocuments.all.toArray();
    for (const doc of documents) {
        doc.state = DocumentState.Validated; // Force re-link
    }
    await services.shared.workspace.DocumentBuilder.update(documents.map(d => d.uri), []);

    // Step 4: Send notification
    connection.window.showInformationMessage('Java classes refreshed');

    return true;
});
```

### Example 4: VS Code Command Registration

In extension.ts (add alongside other commands around line 340):

```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('bbj.refreshJavaClasses', async () => {
        if (!client) {
            vscode.window.showErrorMessage('BBj language server not running');
            return;
        }

        try {
            await client.sendRequest('bbj/refreshJavaClasses');
            // Server sends notification, so we don't need to show message here
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to refresh Java classes: ${error}`);
        }
    })
);
```

And add to package.json commands section:

```json
{
  "command": "bbj.refreshJavaClasses",
  "title": "Refresh Java Classes",
  "category": "BBj"
}
```

### Example 5: IntelliJ Action Implementation

Create new file BbjRefreshJavaClassesAction.java:

```java
package com.basis.bbj.intellij.actions;

import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.project.Project;
import com.redhat.devtools.lsp4ij.LanguageServerWrapper;
import org.eclipse.lsp4j.ExecuteCommandParams;
import org.jetbrains.annotations.NotNull;

import java.util.Collections;

public class BbjRefreshJavaClassesAction extends AnAction {

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) return;

        // Get LSP server wrapper
        LanguageServerWrapper wrapper = BbjLanguageServerFactory.getWrapper(project);
        if (wrapper == null) return;

        // Send custom command to server
        ExecuteCommandParams params = new ExecuteCommandParams(
            "bbj/refreshJavaClasses",
            Collections.emptyList()
        );

        wrapper.getInitializedServer().thenAccept(server -> {
            server.getWorkspaceService().executeCommand(params);
        });
    }
}
```

Register in plugin.xml:

```xml
<action id="bbj.RefreshJavaClasses"
        class="com.basis.bbj.intellij.actions.BbjRefreshJavaClassesAction"
        text="Refresh Java Classes"
        description="Reload Java classpath and clear cached class information">
    <add-to-group group-id="ToolsMenu" anchor="last"/>
</action>
```

## Investigation Findings

### setSlot() Discovery Issue

**Finding 1: Method Exists in Source**
- `setSlot()` is defined in BBjControl.java (interface) as a default method (lines 213-217)
- Two overloads: `setSlot(BBjControl)` and `setSlot(String, BBjControl)`
- Both are empty default implementations

**Finding 2: Inheritance Chain**
```
BBjWebManager (interface)
  └─ extends BBjBuiManager (interface)
       └─ (unknown parent chain)
BBjControl (interface)
  ├─ extends SysGuiProxyConstants
  ├─ extends SysGuiEventConstants
  └─ extends ProxyConstants
```

**Finding 3: Implementation Classes**
- BBjControlFacade.java (concrete class) implements setSlot with actual logic
- Located in `com.basis.bbj.iris.facade` package
- May be separate JAR from the interface definitions

**Hypothesis:**
The issue is likely that BBjWebManager's classpath entry doesn't include the JAR containing BBjControl interface, OR the BBjControl interface is being loaded but the default methods are somehow filtered out.

**Next investigation steps:**
1. Check which JARs contain BBjControl.class and BBjWebManager.class
2. Verify those JARs are in the loaded classpath
3. Add debug logging to see actual method count from getMethods()
4. Test with explicit class load: `getClassInfo("com.basis.bbj.proxies.sysgui.BBjControl")`

### Cyclic Reference Error Context

**Finding 1: Current Enhancement Exists**
- BbjLinker already enhances LinkingError messages with file+line (lines 115-123)
- Format: `${error.message} [in ${relativePath}:${lineNumber}]`
- BUT: This is just text appended to the message, not LSP relatedInformation

**Finding 2: Error Source**
- Cyclic references throw from Langium's DefaultLinker.throwCyclicReferenceError()
- BBj linker extends DefaultLinker but doesn't override throwCyclicReferenceError()
- Error is thrown (not returned), so it doesn't go through normal diagnostic flow

**Finding 3: Other Error Types**
- LinkingError (unresolved reference) — already enhanced with source info via createLinkingError()
- Validation errors — go through BBjDocumentValidator which has access to full context
- Parser errors — handled by Langium's parser, include range automatically

**Conclusion:**
Only cyclic reference errors lack proper LSP diagnostic treatment because they're thrown as exceptions rather than reported as diagnostics.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class.getMethods() only | getMethods() + Object methods for interfaces | BBj implementation | Ensures interface methods get Object's toString/equals/hashCode |
| Throw linking errors | Convert to warnings | BBjDocumentValidator | User-friendlier; valid BBj code that's just missing deps doesn't show as hard errors |
| Console-only errors | Enhanced with source location | BbjLinker (Phase 29) | Users can see which file has the error, but can't click to navigate |
| No timeout on reflection | 10s timeout on getRawClass | Existing (Memory.md) | Prevents infinite hangs from complex class hierarchies |

**Not yet implemented:**
- LSP relatedInformation links for cyclic references
- Manual refresh command
- Cache invalidation mechanism
- Document re-validation after refresh

## Open Questions

1. **Why aren't default interface methods being discovered?**
   - What we know: setSlot exists in source, getMethods() should return it
   - What's unclear: Which JAR contains BBjControl? Is it in the loaded classpath?
   - Recommendation: Add debug logging to InteropService.java, verify JAR contents

2. **Should cyclic reference be Error or Warning?**
   - What we know: User decision says "Error (red)", BBjDocumentValidator currently downgrades LinkingErrors to Warning
   - What's unclear: Whether cyclic references should follow LinkingError pattern
   - Recommendation: Follow user decision — keep as Error severity

3. **How deep to trace the cycle for relatedInformation?**
   - What we know: LSP allows multiple RelatedInformation entries
   - What's unclear: Show just the direct cycle (A→B→A) or full chain if deeper?
   - Recommendation: Start with just the two nodes in the cycle; can expand later

4. **Should refresh be synchronous or asynchronous?**
   - What we know: Classpath reload can take several seconds
   - What's unclear: Block VS Code UI or show progress indicator?
   - Recommendation: Async with progress notification: "Refreshing Java classes..." → "Java classes refreshed"

## Sources

### Primary (HIGH confidence)
- /Users/beff/_workspace/bbj-language-server/java-interop/src/main/java/bbj/interop/InteropService.java - Java reflection implementation
- /Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/java-interop.ts - TypeScript client-side caching
- /Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-linker.ts - Custom linker with enhanced errors
- /Users/beff/svn/trunk/com/basis/bbj/proxies/sysgui/BBjControl.java - setSlot method definition (verified exists)
- GitHub Issue #180 - setSlot missing from autocomplete (concrete test case)
- GitHub Issue #245 - Cyclic reference error lacks file/line info (user pain point)

### Secondary (MEDIUM confidence)
- Langium source: bbj-vscode/node_modules/langium/lib/references/linker.js - throwCyclicReferenceError implementation
- Java Reflection API documentation - getMethods() behavior for interfaces
- LSP Specification 3.17 - DiagnosticRelatedInformation structure

### Tertiary (LOW confidence)
- None identified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are already in use or standard LSP/Java APIs
- Architecture: HIGH - Codebase inspection reveals current patterns clearly
- Pitfalls: HIGH - Specific issues documented in GitHub and MEMORY.md

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - stable APIs, no rapid ecosystem changes expected)
