# Phase 26: CPU Stability - Research

**Researched:** 2026-02-06
**Domain:** Language Server Performance Investigation
**Confidence:** HIGH

## Summary

This research investigates how to diagnose and document the root causes of 100% CPU usage in the BBj language server when multiple BBj projects are opened in a VS Code workspace. The issue (#232) manifests as sustained CPU consumption that doesn't decrease over time, eventually causing system freezes on macOS.

Based on documented language server performance patterns, similar issues in the Langium ecosystem, and examination of the BBj language server codebase, the most likely root causes are: (1) infinite or excessive document rebuild loops triggered by transitive USE statement resolution, (2) file watching notifications causing cascading workspace updates, or (3) inefficient dependency tracking in the IndexManager causing documents to be repeatedly marked as "affected" and rebuilt.

The investigation should use a combination of Node.js CPU profiling (flamegraphs), instrumentation of key document lifecycle methods, and strategic logging to identify hot loops and excessive function calls. The Deno LSP optimization case study provides a proven methodology: create reproducible benchmarks, generate flamegraphs, instrument resource usage, and identify which code paths are executing repeatedly.

**Primary recommendation:** Use Node.js `--cpu-prof` flag with the language server to generate CPU profiles, then analyze with flamegraph visualization to identify hot paths. Instrument key methods in BBjDocumentBuilder, BBjIndexManager, and BBjWorkspaceManager with timing logs and call counters to detect rebuild loops.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Scope: Investigation only**
- Research and analyze the codebase for potential causes of sustained CPU usage
- Document findings with evidence (code paths, patterns, hypotheses)
- Propose concrete mitigations ranked by likelihood and effort
- Do NOT implement fixes in this phase

**Deliverable**
- A findings document covering root cause analysis and mitigation options
- Clear enough that a follow-up phase can plan implementation directly from findings

### Claude's Discretion
- Investigation methodology (profiling, code analysis, tracing)
- How to structure the findings document
- Which code paths to prioritize investigating
- Whether to set up reproduction steps or analyze statically

### Deferred Ideas (OUT OF SCOPE)
- Implementing the actual CPU fix — follow-up phase based on investigation findings
- Adding server health monitoring/status indicators — future phase

</user_constraints>

## Standard Stack

### Core Investigation Tools

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Node.js `--cpu-prof` | Built-in (Node 18+) | CPU profiling | Official Node.js profiler, zero dependencies, production-safe |
| Clinic.js | Latest (4.x) | Comprehensive profiling suite | Industry standard for Node.js performance, includes flame, doctor, bubbleprof |
| 0x | Latest (5.x) | Single-command flamegraph generation | Lightweight, fast flamegraph creation from CPU profiles |
| Chrome DevTools | Built-in | Profile visualization | Supports .cpuprofile files, no additional tools needed |
| VS Code JS Profile Visualizer | Extension | In-editor profile viewing | Integrated workflow, flamechart and tree views |

### Supporting Tools

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `--inspect` flag | Built-in | Remote debugging | When you need live debugging with breakpoints |
| `console.time/timeEnd` | Built-in | Manual timing | Quick instrumentation of specific code sections |
| Langium DevTools | N/A | Framework-specific debugging | If Langium provides specialized debugging (check docs) |

### Installation

```bash
# Investigation tools
npm install -g clinic
npm install -g 0x

# VS Code extension for profile viewing
# Install: "Flame Chart Visualizer for JavaScript Profiles" from marketplace
```

## Architecture Patterns

### Recommended Investigation Structure

```
investigation/
├── profiles/               # CPU profile outputs (.cpuprofile files)
│   ├── baseline.cpuprofile
│   ├── multi-project-cpu-spike.cpuprofile
│   └── flamegraph.html
├── logs/                   # Instrumented output logs
│   ├── document-builder-calls.log
│   ├── index-manager-rebuilds.log
│   └── timing-breakdown.log
├── reproduction/           # Reproducible test cases
│   └── multi-project-workspace/
└── FINDINGS.md            # Investigation results document
```

### Pattern 1: CPU Profile Collection

**What:** Capture CPU profiles during the problematic behavior to identify hot functions
**When to use:** First step in any CPU investigation
**Example:**

```bash
# Start language server with CPU profiling
node --cpu-prof ./bbj-vscode/out/language/main.cjs --node-ipc --clientProcessId=<PID>

# After reproducing the issue (opening multi-project workspace), stop the server
# This generates a CPU profile file: CPU.<timestamp>.cpuprofile

# Generate flamegraph visualization
0x CPU.*.cpuprofile
# Or use Clinic.js
clinic flame -- node ./bbj-vscode/out/language/main.cjs --node-ipc --clientProcessId=<PID>
```

### Pattern 2: Instrumentation at Key Lifecycle Points

**What:** Add timing and call count logging to document lifecycle methods
**When to use:** After CPU profile identifies hot module, before diving into specifics
**Example:**

```typescript
// In bbj-document-builder.ts
protected override async buildDocuments(documents: LangiumDocument<AstNode>[], options: BuildOptions, cancelToken: CancellationToken): Promise<void> {
    const callId = Math.random().toString(36).slice(2, 9);
    const started = Date.now();
    console.warn(`[PROFILE-${callId}] buildDocuments START: ${documents.length} docs, options=${JSON.stringify(options)}`);

    await super.buildDocuments(documents, options, cancelToken);
    console.warn(`[PROFILE-${callId}] buildDocuments SUPER complete: ${Date.now() - started}ms`);

    await this.addImportedBBjDocuments(documents, options, cancelToken);
    console.warn(`[PROFILE-${callId}] buildDocuments COMPLETE: ${Date.now() - started}ms`);
}

// Similar instrumentation for:
// - addImportedBBjDocuments
// - BBjIndexManager.isAffected
// - BBjWorkspaceManager.initializeWorkspace
// - BbjLinker.link
```

### Pattern 3: Dependency Graph Visualization

**What:** Log document dependency relationships to detect circular rebuilds
**When to use:** When instrumentation shows same documents repeatedly rebuilt
**Example:**

```typescript
// In bbj-document-builder.ts addImportedBBjDocuments
async addImportedBBjDocuments(documents: LangiumDocument<AstNode>[], options: BuildOptions, cancelToken: CancellationToken) {
    // ... existing code ...

    for (const document of documents) {
        const imports = new Set<string>();
        AstUtils.streamAllContents(document.parseResult.value).filter(isUse).forEach((use: Use) => {
            if (use.bbjFilePath) {
                const cleanPath = use.bbjFilePath.match(BBjPathPattern)![1];
                imports.add(cleanPath);
            }
        });

        if (imports.size > 0) {
            console.warn(`[DEP-GRAPH] ${document.uri.toString()} IMPORTS: ${Array.from(imports).join(', ')}`);
        }
    }

    // ... existing code ...
}
```

### Pattern 4: Rebuild Loop Detection

**What:** Track which documents trigger rebuilds and how often
**When to use:** To detect infinite or excessive rebuild cycles
**Example:**

```typescript
// Global counters (for investigation only)
const rebuildCounts = new Map<string, number>();
const rebuildTimestamps = new Map<string, number[]>();

// In BBjIndexManager.isAffected
public override isAffected(document: LangiumDocument<AstNode>, changedUris: Set<string>): boolean {
    const uri = document.uri.toString();
    const count = (rebuildCounts.get(uri) || 0) + 1;
    rebuildCounts.set(uri, count);

    const timestamps = rebuildTimestamps.get(uri) || [];
    timestamps.push(Date.now());
    rebuildTimestamps.set(uri, timestamps);

    // Detect rapid rebuild loop (>10 rebuilds in 5 seconds)
    const recentRebuilds = timestamps.filter(t => Date.now() - t < 5000);
    if (recentRebuilds.length > 10) {
        console.error(`[REBUILD-LOOP] ${uri} rebuilt ${recentRebuilds.length} times in 5 seconds! Changed URIs: ${Array.from(changedUris).join(', ')}`);
    }

    const result = super.isAffected(document, changedUris);
    console.warn(`[AFFECTED] ${uri} affected=${result} by changes to: ${Array.from(changedUris).join(', ')}`);
    return result;
}
```

### Anti-Patterns to Avoid

- **Profile without reproduction:** Don't profile random server runs; use reproducible multi-project workspace setups
- **Instrument too broadly:** Start with high-level lifecycle methods, drill down only after identifying hot paths
- **Ignore flamegraph plateaus:** Wide flat sections in flamegraphs indicate hot loops — investigate these first
- **Skip call counting:** CPU time alone doesn't reveal excessive calls; track invocation frequency
- **Premature optimization:** Complete investigation and document findings before implementing any fixes

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CPU profiling | Custom timing wrapper framework | Node.js `--cpu-prof` + 0x or Clinic.js | Production-tested, standard output format, visualization included |
| Flamegraph generation | Manual stack sampling | 0x, Clinic.js Flame, or Chrome DevTools | Complex statistical analysis, proven visualizations |
| Memory leak detection | Manual heap snapshot diffing | Clinic.js Heap, Chrome DevTools Memory | Automatic leak pattern detection, comparative analysis |
| Async operation profiling | Custom promise tracking | Clinic.js Bubbleprof | Visualizes async delays and bubbles up bottlenecks |
| Performance benchmarking | Ad-hoc timing scripts | Benchmark.js or Clinic.js Doctor | Statistical rigor, handles warmup/cooldown, detects outliers |

**Key insight:** Node.js ecosystem has mature, battle-tested profiling tools. Custom instrumentation should supplement, not replace, these tools. Flamegraphs are essential for understanding CPU hot paths — don't try to infer from logs alone.

## Common Pitfalls

### Pitfall 1: Transitive Document Rebuild Loops

**What goes wrong:** In multi-project workspaces, document A imports document B (via USE statement), and B imports A. When workspace initializes, both documents trigger mutual rebuilds indefinitely.

**Why it happens:** The `addImportedBBjDocuments` method in BBjDocumentBuilder calls `this.update(addedDocuments, [], cancelToken)` after loading transitive dependencies. If imported documents themselves have USE statements to workspace documents, this can trigger another build cycle.

**How to avoid:**
- Track which documents are already being processed (processing set)
- Mark imported documents as "external" to prevent re-triggering workspace updates
- Implement maximum recursion depth for transitive imports
- Use Langium's document state machine to skip already-processed documents

**Warning signs:**
- Same documents appearing repeatedly in build logs
- CPU profile shows `buildDocuments` or `addImportedBBjDocuments` dominating flamegraph
- Console logs show same file paths in rapid succession
- Multiple "Transitive BBj file update" log messages for the same documents

**Evidence from codebase:**
```typescript
// bbj-document-builder.ts lines 88-93
if (addedDocuments.length > 0) {
    const started = Date.now()
    await this.update(addedDocuments, [], cancelToken);  // ← Could trigger another buildDocuments call
    const elapsed = Date.now() - started
    console.debug(`Transitive BBj file update for ${addedDocuments.length} documents took ${elapsed}ms`)
}
```

### Pitfall 2: IndexManager Over-Invalidation

**What goes wrong:** When a document changes in a multi-project workspace, Langium's `IndexManager.isAffected` method marks too many documents as needing rebuilds, causing cascading reprocessing of unrelated files.

**Why it happens:** The BBjIndexManager's `isAffected` override (lines 14-32 in bbj-index-manager.ts) has complex logic for external documents. If this logic incorrectly returns `true` for documents that shouldn't be affected, they'll be unnecessarily rebuilt.

**How to avoid:**
- Log every `isAffected` call with document URI and changed URIs
- Verify external document detection works correctly
- Ensure reference error checking doesn't cause false positives
- Test with multi-project workspace to verify only truly affected documents rebuild

**Warning signs:**
- CPU profile shows `isAffected` called thousands of times
- Documents outside the edited project get rebuilt
- Every file change triggers full workspace reprocessing
- Linking phase takes progressively longer over time

**Evidence from codebase:**
```typescript
// bbj-index-manager.ts lines 22-24
if (document.references.some(e => e.error !== undefined)) {
    // don't rebuild external documents that has errors
    return !isExternal  // ← Could this cause excessive rebuilds?
}
```

### Pitfall 3: File System Watcher Notification Storms

**What goes wrong:** File system watchers trigger document rebuild events faster than they can be processed, creating a backlog that keeps CPU at 100% indefinitely.

**Why it happens:** Langium automatically watches workspace files for changes. In multi-project workspaces with many files, even a single save or external file modification can trigger hundreds of `didChangeWatchedFiles` notifications if not properly debounced or filtered.

**How to avoid:**
- Verify `shouldIncludeEntry` in BBjWorkspaceManager properly filters non-BBj files
- Check if file watchers are properly disposed when workspaces change
- Ensure Langium's built-in debouncing/batching is working
- Verify workspace initialization isn't re-triggered on every file change

**Warning signs:**
- CPU spikes correlate with file saves or external git operations
- Console shows rapid file change events
- CPU profile shows file system operations dominating
- Language server doesn't recover after initial spike

**Evidence from codebase:**
```typescript
// bbj-ws-manager.ts lines 129-141
override shouldIncludeEntry(entry: { isFile: boolean; isDirectory: boolean; uri: URI }): boolean {
    if (entry.isFile) {
        const path = entry.uri.path.toLowerCase();
        if (!path.endsWith('.bbj') && !path.endsWith('.bbl') && !path.endsWith('.bbjt')) {
            return false;  // ← Good filtering, but is it sufficient?
        }
    }
    return super.shouldIncludeEntry(entry);
}
```

### Pitfall 4: Java Interop Service Blocking

**What goes wrong:** Java interop operations (classpath loading, class resolution) block the event loop during workspace initialization, making server appear unresponsive and consuming CPU while waiting.

**Why it happens:** JavaInteropService connects to an external Java process via socket (port 5008). If this process is slow, unresponsive, or repeatedly queried, it can block language server operations.

**How to avoid:**
- Verify Java service connection is truly async (not blocking event loop)
- Check if classpath loading is re-triggered unnecessarily
- Ensure Java service timeouts are configured
- Verify connection errors don't cause retry loops

**Warning signs:**
- CPU profile shows socket operations or connection code
- Workspace initialization never completes
- Console shows repeated "Failed to connect to Java service" errors
- Works in single-project but fails in multi-project workspace

**Evidence from codebase:**
```typescript
// bbj-ws-manager.ts lines 112-118
if (classpathToUse.length > 0) {
    console.log(`Loading classpath with entries: ${JSON.stringify(classpathToUse)}`);
    const loaded = await this.javaInterop.loadClasspath(classpathToUse, cancelToken)
    console.log(`Java Classes ${loaded ? '' : 'not '}loaded`)
} else {
    console.warn("No classpath set. No Java classes loaded.")
}
```

### Pitfall 5: Excessive AST Traversal

**What goes wrong:** Methods like `AstUtils.streamAllContents` are called repeatedly on the same documents without caching results, causing O(n) traversals to become O(n²) or worse.

**Why it happens:** BBj language server uses `streamAllContents` to find USE statements (line 55 in bbj-document-builder.ts) and other nodes. In multi-project workspace with many files, this traversal cost multiplies.

**How to avoid:**
- Use Langium's DocumentCache to store expensive computation results
- Cache extracted USE statements per document
- Invalidate cache only when document actually changes
- Consider using Langium's indexing instead of full AST traversal

**Warning signs:**
- CPU profile shows `streamAllContents` or `streamAst` as hot functions
- Time scales non-linearly with number of files
- Same documents traversed multiple times per build cycle
- Linking phase takes longer than parsing phase

**Evidence from codebase:**
```typescript
// bbj-document-builder.ts lines 53-60
for (const document of documents) {
    await interruptAndCheck(cancelToken);
    AstUtils.streamAllContents(document.parseResult.value).filter(isUse).forEach((use: Use) => {
        if (use.bbjFilePath) {
            const cleanPath = use.bbjFilePath.match(BBjPathPattern)![1];
            bbjImports.add(cleanPath);
        }
    })
}
```

## Investigation Methodology

### Phase 1: Reproduce and Capture (HIGH priority)

**Objective:** Create reproducible test case and capture CPU profile

**Steps:**
1. Create multi-project workspace with ≥2 BBj projects containing USE statements
2. Launch language server with `--cpu-prof` flag
3. Open workspace in VS Code, trigger CPU spike
4. Wait 30-60 seconds (or until CPU stabilizes/system freezes)
5. Stop language server to write CPU profile
6. Generate flamegraph: `0x CPU.*.cpuprofile`

**Expected output:**
- `.cpuprofile` file showing CPU time distribution
- Flamegraph HTML showing hot paths
- Identification of which module/function dominates CPU time

**Tools:** Node.js built-in `--cpu-prof`, 0x or Clinic.js Flame

### Phase 2: Instrument Hot Paths (HIGH priority)

**Objective:** Add targeted logging to understand hot path behavior

**Steps:**
1. Based on flamegraph, identify top 3 hot functions
2. Add instrumentation (timing, call counts, parameters) to these functions
3. Reproduce issue with instrumented server
4. Analyze logs for patterns:
   - Same documents processed repeatedly?
   - Specific documents causing cascades?
   - Timing progressively worse?
   - Call counts escalating?

**Expected output:**
- Log file showing document processing flow
- Identification of specific documents or patterns causing loops
- Evidence of infinite recursion or excessive iteration

**Tools:** `console.warn` with structured prefixes (e.g., `[PROFILE]`, `[DEP-GRAPH]`), log aggregation

### Phase 3: Dependency Analysis (MEDIUM priority)

**Objective:** Map document dependencies to detect circular references

**Steps:**
1. Instrument `addImportedBBjDocuments` to log USE statement graph
2. Create visualization of document import relationships
3. Check for circular dependencies (A imports B imports A)
4. Verify external document detection working correctly

**Expected output:**
- Dependency graph (text or visual) showing import relationships
- Identification of circular imports if they exist
- Verification that external documents don't trigger workspace rebuilds

**Tools:** Graph visualization (mermaid.js, Graphviz), log analysis scripts

### Phase 4: Index Manager Audit (MEDIUM priority)

**Objective:** Verify `isAffected` logic doesn't over-invalidate

**Steps:**
1. Instrument `BBjIndexManager.isAffected` with full logging
2. Open multi-project workspace, edit single file
3. Analyze which documents marked as affected
4. Verify only truly dependent documents affected

**Expected output:**
- List of affected documents per change
- Identification of false-positive affectedness
- Evidence of over-invalidation patterns

**Tools:** Log analysis, document state tracking

### Phase 5: File Watcher Analysis (LOW priority)

**Objective:** Rule out file system notification storms

**Steps:**
1. Monitor file change events during workspace initialization
2. Check for excessive notifications
3. Verify `shouldIncludeEntry` filtering working
4. Test with large multi-project workspace

**Expected output:**
- Count of file change notifications during initialization
- Verification that only BBj files trigger processing
- Confirmation file watching isn't causing CPU spike

**Tools:** Langium's built-in logging, file system monitoring

## Code Examples

### Profile Collection Setup

```bash
# Method 1: Direct Node.js profiling
node --cpu-prof /Users/beff/_workspace/bbj-language-server/bbj-vscode/out/language/main.cjs --node-ipc --clientProcessId=$$

# Method 2: Clinic.js comprehensive profiling
clinic doctor -- node /Users/beff/_workspace/bbj-language-server/bbj-vscode/out/language/main.cjs --node-ipc --clientProcessId=$$

# Method 3: Flame graph only
clinic flame -- node /Users/beff/_workspace/bbj-language-server/bbj-vscode/out/language/main.cjs --node-ipc --clientProcessId=$$

# Generate flamegraph from .cpuprofile
0x CPU.*.cpuprofile
# Opens HTML flamegraph in browser
```

### Instrumentation Template

```typescript
// Add to any method suspected of being hot path
private instrumentedMethod(param: any): ResultType {
    const methodName = 'ClassName.methodName';
    const callId = Math.random().toString(36).slice(2, 9);
    const started = Date.now();

    // Track call frequency
    globalThis.__profileCounts = globalThis.__profileCounts || new Map();
    const count = (globalThis.__profileCounts.get(methodName) || 0) + 1;
    globalThis.__profileCounts.set(methodName, count);

    console.warn(`[PROFILE-${callId}] ${methodName} START (call #${count}): ${JSON.stringify(param).slice(0, 200)}`);

    try {
        const result = this.actualLogic(param);
        const elapsed = Date.now() - started;
        console.warn(`[PROFILE-${callId}] ${methodName} COMPLETE: ${elapsed}ms`);

        // Alert on suspicious patterns
        if (elapsed > 1000) console.error(`[PROFILE-SLOW] ${methodName} took ${elapsed}ms!`);
        if (count > 100) console.error(`[PROFILE-EXCESSIVE] ${methodName} called ${count} times!`);

        return result;
    } catch (e) {
        console.error(`[PROFILE-${callId}] ${methodName} ERROR:`, e);
        throw e;
    }
}
```

### Rebuild Loop Detector

```typescript
// Add to BBjDocumentBuilder or BBjIndexManager
class RebuildLoopDetector {
    private static readonly MAX_REBUILDS_PER_WINDOW = 10;
    private static readonly TIME_WINDOW_MS = 5000;
    private static rebuilds = new Map<string, number[]>();

    static recordRebuild(documentUri: string): void {
        const now = Date.now();
        const timestamps = this.rebuilds.get(documentUri) || [];

        // Keep only recent timestamps
        const recent = timestamps.filter(t => now - t < this.TIME_WINDOW_MS);
        recent.push(now);
        this.rebuilds.set(documentUri, recent);

        // Detect loop
        if (recent.length >= this.MAX_REBUILDS_PER_WINDOW) {
            console.error(
                `[REBUILD-LOOP-DETECTED] ${documentUri} rebuilt ${recent.length} times in ${this.TIME_WINDOW_MS}ms! ` +
                `This indicates an infinite rebuild loop. Recent rebuild times: ${recent.map(t => t - now).join(', ')}ms ago`
            );

            // Optional: throw error to break the loop
            // throw new Error(`Rebuild loop detected for ${documentUri}`);
        }
    }

    static getStats(): string {
        const stats = Array.from(this.rebuilds.entries())
            .map(([uri, timestamps]) => `${uri}: ${timestamps.length} rebuilds`)
            .join('\n');
        return stats || 'No rebuilds recorded';
    }
}

// Use in buildDocuments:
protected override async buildDocuments(documents: LangiumDocument<AstNode>[], options: BuildOptions, cancelToken: CancellationToken): Promise<void> {
    for (const doc of documents) {
        RebuildLoopDetector.recordRebuild(doc.uri.toString());
    }
    await super.buildDocuments(documents, options, cancelToken);
    await this.addImportedBBjDocuments(documents, options, cancelToken);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual timing with `Date.now()` | Node.js `--cpu-prof` + flamegraphs | Node.js 12+ (2019) | Statistical sampling gives accurate CPU time without overhead |
| Synchronous document processing | Async with `CancellationToken` | Langium 1.0+ (2022) | Allows cancellation of long operations, prevents blocking |
| Full workspace rebuild on any change | Selective invalidation with `isAffected` | Langium 2.0+ (2023) | Dramatically reduces rebuild scope in large workspaces |
| Guess at performance issues from logs | Data-driven investigation with flamegraphs | Industry standard (2020+) | Visual identification of hot paths, no guesswork |
| Request all files on every keystroke | Cache + selective file sync | Modern LSP implementations | Deno LSP optimization (2024) reduced 8s to <1s |

**Deprecated/outdated:**
- **Manual heap inspection:** Use Chrome DevTools or Clinic.js Heap instead
- **`console.log` timing only:** Supplement with CPU profiling for complete picture
- **Profiling in production without flags:** Use `--cpu-prof` which is production-safe
- **Ignoring cancellation tokens:** Always check `cancelToken` in long operations

## Open Questions

### 1. Does Langium have built-in rebuild loop prevention?

**What we know:** Langium uses document state machines (Parsed, Linked, Validated) and heuristics to avoid unnecessary rebuilds. The `IndexManager.isAffected` method determines which documents need reprocessing.

**What's unclear:** Does Langium track documents currently being processed to prevent circular rebuild triggers? If A triggers B rebuild and B triggers A rebuild, is there a guard?

**Recommendation:**
- Review Langium's DefaultDocumentBuilder and DefaultIndexManager source code
- Test with artificial circular dependency (A USE B, B USE A)
- If no protection exists, findings document should recommend adding processing set

### 2. How does `addImportedBBjDocuments` interact with workspace initialization?

**What we know:** BBjDocumentBuilder calls `this.update(addedDocuments, [], cancelToken)` after loading transitive USE dependencies. This triggers another build cycle for imported documents.

**What's unclear:**
- Are imported documents marked differently to prevent re-triggering workspace updates?
- Does `update()` call respect document states or rebuild everything?
- In multi-project workspace, do imported documents from one project trigger rebuilds in other projects?

**Recommendation:**
- Instrument both `buildDocuments` and `update` with detailed logging
- Track which documents enter build pipeline and why
- Verify imported documents don't cause cascading workspace rebuilds
- Check if BBjWorkspaceManager's `isExternalDocument` prevents this

### 3. Is Java interop service connection causing blocking?

**What we know:** JavaInteropService connects via socket to port 5008. Connection is async using Promises. Classpath loading happens during workspace initialization.

**What's unclear:**
- Is the Java service single-threaded and blocking on classpath parsing?
- In multi-project workspace with multiple classpaths, are requests serialized or parallel?
- Does connection timeout properly or can it hang indefinitely?
- Are there retry loops if connection fails?

**Recommendation:**
- Monitor socket connection timing during CPU spike
- Verify Java service process CPU usage (is it also at 100%?)
- Check if CPU issue occurs even without Java service running
- Consider making classpath loading lazy (on-demand) vs. upfront

### 4. What triggers `isAffected` to return true for unrelated documents?

**What we know:** BBjIndexManager.isAffected has special logic for external documents (lines 14-32). It checks if document has reference errors and if changed URIs are external.

**What's unclear:**
- The logic `![...changedUris].every(changed => bbjWsManager.isExternalDocument(URI.parse(changed))) && isExternal` is complex. Could this have off-by-one or boolean logic errors?
- Does "document.references.some(e => e.error !== undefined)" correctly identify documents with errors?
- Are external documents being incorrectly marked as workspace documents?

**Recommendation:**
- Add logging to every branch of `isAffected` logic
- Verify with concrete examples (workspace doc changes, external doc changes)
- Test with documents that have reference errors vs. clean references
- Consider simplifying logic if it's causing false positives

### 5. Is there a VSCode setting to disable multi-root workspace?

**What we know:** Issue occurs in "VS Code workspace containing multiple projects." Single-project workspaces may not exhibit the problem.

**What's unclear:**
- Is this a multi-root workspace (multiple workspace folders) or single workspace with multiple BBj projects in subdirectories?
- Can users work around by opening one project at a time?
- Does VSCode's multi-root workspace feature trigger additional file watching or workspace sync?

**Recommendation:**
- Document reproduction steps precisely (multi-root vs. monorepo structure)
- Test both multi-root workspace and single-root with multiple projects
- Findings document should clarify which workspace configuration triggers the issue
- Consider short-term workaround documentation while fix is developed

## Sources

### Primary (HIGH confidence)

- **GitHub Issue #232:** Direct user reports of 100% CPU usage in multi-project workspaces
  - Process identified via Activity Monitor and `ps aux`
  - BBj language server extension process consuming full CPU core
  - Issue persists even after VS Code closed

- **BBj Language Server Codebase:** Direct examination of implementation
  - `bbj-document-builder.ts`: Document lifecycle and transitive import loading
  - `bbj-index-manager.ts`: Document affectedness logic
  - `bbj-ws-manager.ts`: Workspace initialization and file filtering
  - `bbj-linker.ts`: Linking phase with timing instrumentation

- **Langium Documentation - Document Lifecycle:** https://langium.org/docs/reference/document-lifecycle/
  - Document state machines (Changed → Parsed → Linked → Validated)
  - IndexManager's role in tracking dependencies and exported symbols
  - How document invalidation triggers rebuilds

- **Langium Documentation - Caches:** https://langium.org/docs/recipes/performance/caches/
  - DocumentCache and WorkspaceCache mechanisms
  - Cache invalidation on document/workspace changes
  - Performance optimization strategies

- **Node.js Official Profiling Guide:** https://nodejs.org/en/learn/getting-started/profiling
  - `--cpu-prof` flag usage and output format
  - Production-safe profiling techniques
  - Integration with Chrome DevTools

- **Node.js Flame Graphs Guide:** https://nodejs.org/en/learn/diagnostics/flame-graphs
  - How to interpret flamegraphs
  - Using perf and 0x for CPU profiling
  - Identifying hot paths visually

### Secondary (MEDIUM confidence)

- **Deno LSP Optimization Case Study:** https://deno.com/blog/optimizing-our-lsp
  - Investigation methodology: benchmarking, instrumentation, flamegraphs
  - Root cause: requesting all files (including dependencies) on every keystroke
  - Solution: selective file sync and caching layer
  - Result: 8 seconds → <1 second auto-completion time

- **Language Server Protocol - Implementation Practices:** Web search findings (2022 study)
  - textDocument/didChange is most performance-critical notification
  - Incremental updates essential for performance
  - State caching and intelligent invalidation required
  - 13 servers reprocess on changes, 7 invalidate

- **Langium Performance Features:** https://langium.org/docs/features/
  - Automatic workspace file processing
  - Heuristics to invalidate/recompute only what's necessary
  - Built-in handling of file changes

- **Clinic.js Documentation:** https://clinicjs.org/
  - Comprehensive Node.js profiling suite
  - Doctor, Flame, Bubbleprof tools for different bottlenecks
  - Production-safe profiling techniques

- **0x Flamegraph Tool:** https://github.com/davidmarkclements/0x
  - Single-command flamegraph generation
  - Cross-platform support (macOS, Linux, Windows)
  - Production server friendly approach

### Tertiary (LOW confidence - patterns from ecosystem)

- **General Language Server CPU Issues:** Web search findings
  - Python Language Server Issue #1892: 100% CPU on large projects
  - R Language Server Issue #245: Excessive CPU usage
  - PHP Language Server Issue #461: 100% CPU while idle
  - Common pattern: file watching, dependency resolution, indexing

- **Maven/Build System Rebuild Loops:** https://issues.apache.org/jira/browse/MSHADE-148
  - Infinite loops building dependency-reduced-pom.xml
  - Pattern: circular transitive dependencies cause rebuild loops
  - Similar pattern could apply to language server document dependencies

- **VSCode Performance Profiling:** https://code.visualstudio.com/docs/nodejs/profiling
  - VS Code's built-in JavaScript profiler
  - CPU profiles viewable directly in editor
  - Collecting ~10,000 samples per second

## Metadata

**Confidence breakdown:**
- Investigation methodology: HIGH - Node.js profiling tools are well-documented and proven
- Likely root causes: MEDIUM - Based on code examination and similar issues, but unverified
- Deno LSP parallels: HIGH - Published case study with similar symptoms and investigation approach
- Langium-specific patterns: MEDIUM - General Langium documentation available, but BBj-specific behavior untested
- Mitigation strategies: LOW - Specific fixes depend on investigation findings (this is investigation phase)

**Research date:** 2026-02-06
**Valid until:** 60 days (stable frameworks, but profiling tools evolve)

**Research methodology used:**
1. Examined GitHub issue #232 for symptom details
2. Reviewed BBj language server source code for potential causes
3. Researched Langium framework architecture and performance patterns
4. Investigated Node.js profiling tools and best practices
5. Studied Deno LSP optimization case study as parallel example
6. Searched for common language server CPU issues and patterns
7. Documented investigation approaches and instrumentation strategies

**Key insight for planner:** This investigation phase should produce a findings document (FINDINGS.md) that includes:
- Concrete evidence (CPU profiles, flamegraphs, instrumented logs)
- Identified root cause(s) with supporting data
- Ranked list of mitigation strategies with effort estimates
- Reproducible test case for validation
- Code locations requiring changes

The follow-up implementation phase can then plan specific tasks based on documented findings rather than speculation.
