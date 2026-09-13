# Phase 91: Language Server Responsiveness - Pattern Map

**Mapped:** 2026-09-12
**Files analyzed:** 8 modified + 1 new test file
**Analogs found:** 9 / 9 (all in-repo, all tracked source)

This phase modifies existing files in place; there are no new production files. Each file's own
prior code (or a sibling file's existing override pattern) is the analog. RESEARCH.md already did
the file:line archaeology this session with verbatim excerpts — this document re-packages it as
per-file pattern assignments for the planner, adds the missing test-file analog table, and confirms
every path named is git-tracked source (see command output below).

**Tracked-source verification:** `git ls-files` confirms all nine analog files are tracked in
`bbj-vscode/src/language/` and `bbj-vscode/test/` — none are `.gsd`/plugin-mirror paths.

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|----------------|------|-----------|-----------------|---------------|
| `bbj-vscode/src/language/java-interop.ts` (breaker, D-01/02/03) | service | event-driven (socket RPC) | same file's `connect()`/`establishConnection()`/`createSocket()` | exact (self) |
| `bbj-vscode/src/language/java-interop.ts` (in-flight registry, D-07) | service | CRUD (cache) | same file's `_pendingResolutions` map + `resolveClassByName` | exact (self) |
| `bbj-vscode/src/language/java-interop.ts` (stub-cache flag, D-03) | service | CRUD (cache) | same file's `createStubClass(className, cache)` | exact (self, param already exists) |
| `bbj-vscode/src/language/main.ts` (recovery callback wiring, D-04) | service/wiring | event-driven | same file's `reloadJavaClassesAndRevalidate()` | exact (self, extract steps 2-4) |
| `bbj-vscode/src/language/bbj-notifications.ts` (D-05 dedupe) | utility | request-response | same file's `notifyJavaConnectionError` + its main.ts-isolation pattern | exact (self) |
| `bbj-vscode/src/language/bbj-index-manager.ts` (D-10 reverse index) | service | CRUD (index) | `DefaultIndexManager.updateContent`/`remove`/`removeContent` (Langium base) + this file's existing `isAffected` override | role-match (extends Langium base like existing override) |
| `bbj-vscode/src/language/bbj-scope.ts` (`getBBjClassesFromFile`, D-10) | service | request-response (lookup) | same file's own current O(N) implementation, replacing the scan with a call to the new index | exact (self) |
| `bbj-vscode/src/language/bbj-scope-local.ts` (`collectLocalSymbols`, D-09) | service | transform (AST walk) | `bbj-linker.ts` `link()` — the `treeIter.prune()` template | exact analog (different file, same walk shape) |
| `bbj-vscode/src/language/bbj-completion-provider.ts` (D-11 AsyncLocalStorage) | provider/service | request-response | same file's current `activeCancelToken` field + `test/java-interop-timeouts.test.ts`'s override-subclass test pattern | exact (self) for prod code; role-match for the test |

## Pattern Assignments

### `bbj-vscode/src/language/java-interop.ts` — circuit breaker (RESP-02, D-01/D-02)

**Analog:** same file's existing `createSocket()` / `connect()` / `establishConnection()` and the
existing timeout constants block.

**Existing connect-level failure surface** (`java-interop.ts:212-229`):
```typescript
protected createSocket(): Promise<Socket> {
    return new Promise((resolve, reject) => {
        const socket = new Socket();
        const timeout = setTimeout(() => {
            socket.destroy();
            reject(new Error('Socket connection to Java service timed out after 10s'));
        }, 10000);
        socket.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
        socket.on('ready', () => {
            clearTimeout(timeout);
            resolve(socket);
        });
        socket.connect(this.interopPort, this.interopHost);
    });
}
```
Breaker success/failure classification wraps only this call site (and the handshake, if any) —
**not** `getRawClass`'s post-connect 10s request timeout (`java-interop.ts:262-273`), which is
"connected but slow," per D-02.

**Existing constants to respect, not change** (`java-interop.ts:40, 113-115, 218, 271`):
```typescript
export const RESOLVED_CLASSES_CACHE_LIMIT = 5000;
private static readonly MAX_RESOLUTION_DEPTH = 50;
private static readonly RESOLUTION_TIMEOUT_MS = 30_000;
// createSocket(): 10000 ms connect timeout
// getRawClass(): 10000 ms request timeout (Promise.race)
```

**Placement rule (anti-pattern to avoid):** the breaker must short-circuit *before*
`acquireLock()` is called — D-06 keeps the existing `lockQueue`/`currentLockToken` scheme
completely unchanged; do not add a second queue layer inside it.

**clearCache() as the one reset point** — confirm this existing method (search
`clearCache()` in `java-interop.ts`) is where the breaker's `closed` reset happens alongside
existing cache-clear behavior.

---

### `bbj-vscode/src/language/java-interop.ts` — stub-caching narrowing (RESP-02, D-03)

**Analog:** same file's `createStubClass`, which already has the exact flag this decision needs.

```typescript
// java-interop.ts:613-642
private createStubClass(className: string, cache: boolean = true): JavaClass {
    const existing = this.resolvedClasses.get(className);
    if (existing) return existing;
    const stub: Mutable<JavaClass> = {
        $type: JavaClass.$type,
        ...
        error: `Resolution failed or depth limit exceeded`,
    } as unknown as Mutable<JavaClass>;
    if (cache) {
        this.resolvedClasses.set(className, stub);
    }
    return stub;
}
```

**Call site to branch** — `doResolveClassByName`'s catch (`java-interop.ts:605-611`), which today
calls `createStubClass(className)` (implicit `cache: true`) for every failure reason:
```typescript
} catch (e) {
    logger.warn(`Failed to resolve Java class '${className}': ${e}`);
    return this.createStubClass(className);
} finally {
    release();
}
```
Change: classify the caught error as transport-level (breaker open / connect refused / 10s socket
timeout / 10s request timeout / 30s chain timeout) vs. a genuine backend "not found" (only possible
when `getRawClass` itself resolved with an `error`-bearing `JavaClass`, distinguishable per the
backend contract in RESEARCH.md's "not found" section) and pass `cache: false` only for the
transport-level branch.

---

### `bbj-vscode/src/language/java-interop.ts` — in-flight Phase-2 registry (RESP-03, D-07/D-08)

**Analog:** same file's existing `_pendingResolutions` map pattern plus the `resolveClass` /
`resolveClassByName` re-entry checks that must be extended, not replaced.

**Injection point** (`java-interop.ts:704-712`):
```typescript
// Register in resolvedClasses now that isStatic and deprecated are fully populated.
this.resolvedClasses.set(className, javaClass);

try {
    // Phase 2 (async): resolve type references and populate documentation.
    const documentation = await this.javadocProvider.getDocumentation(javaClass);
```
Add `this._inFlightPhase2.set(className, javaClass)` at this exact statement; remove it in a
`finally` wrapping the whole Phase-2 `try` (covers success, thrown error, chain timeout — cancellation
settles via the same path since nothing here observes a token directly).

**Three fast paths to extend with the registry check:**
```typescript
// java-interop.ts:545-580 (resolveClassByName) — condensed
async resolveClassByName(className: string, token?: CancellationToken, _depth: number = 0): Promise<JavaClass> {
    if (this.resolvedClasses.has(className)) { return this.resolvedClasses.get(className)!; }
    const pending = this._pendingResolutions.get(className);
    if (pending) { return pending; }
    ...
}
```
```typescript
// java-interop.ts:651-655 (resolveClass re-entry check — the load-bearing one per RESEARCH.md tracing)
protected async resolveClass(javaClass: Mutable<JavaClass>, token?: CancellationToken, _depth: number = 0): Promise<JavaClass> {
    const className = javaClass.name
    if (this.resolvedClasses.has(className)) {
        return this.resolvedClasses.get(className)!;
    }
```
```typescript
// java-interop.ts:325-328 — the direct-entry call that bypasses _pendingResolutions entirely
await Promise.all(implicitJavaImports.concat('java.sql').map(async pack => {
    const classInfos = await connection.sendRequest(getClassInfosRequest, { packageName: pack }, token);
    await Promise.all(classInfos.map(async javaClass => {
        await this.resolveClass(javaClass, token)   // <-- bypasses _pendingResolutions
```
All three add `|| this._inFlightPhase2.has(className)` (returning the in-flight value) beside their
existing `resolvedClasses.has` check. Do **not** modify `LruMap` itself — `_inFlightPhase2` is a
plain separate `Map`.

**Test seam analog** — mirrors two existing subclass-override test patterns:
```typescript
// test/java-interop-service.test.ts:71-76 — MockableJavaInteropService overrides createSocket()
// test/java-interop-timeouts.test.ts:24-33 — HangingBackendInterop overrides connect()
```
For RESP-03's forced-eviction seam, refactor the LRU construction into a protected factory:
```typescript
// java-interop.ts:103 (current)
private readonly _resolvedClasses = new LruMap<string, JavaClass>(RESOLVED_CLASSES_CACHE_LIMIT);
```
into `protected createResolvedClassesLru(): LruMap<string, JavaClass> { return new LruMap(RESOLVED_CLASSES_CACHE_LIMIT); }`
called from the constructor, so a test subclass overrides it with `new LruMap(2)`, following the
exact same override shape as the two existing test subclasses above.

---

### `bbj-vscode/src/language/main.ts` + `bbj-vscode/src/language/bbj-notifications.ts` — recovery callback (RESP-02, D-04/D-05)

**Analog:** same file's existing `reloadJavaClassesAndRevalidate()`, and `bbj-notifications.ts`'s
existing main.ts-isolation module pattern.

```typescript
// main.ts:125-158 — existing steps 1-5
async function reloadJavaClassesAndRevalidate(): Promise<void> {
    const javaInterop = BBj.java.JavaInteropService;
    javaInterop.clearCache();                                          // step 1 — SKIP for D-04 recovery
    const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;
    const settings = wsManager.getSettings();
    if (settings && settings.classpath.length > 0) {
        await javaInterop.loadClasspath(settings.classpath);           // step 2 — KEEP for D-04 recovery
    }
    await javaInterop.loadImplicitImports();                           // step 3 — KEEP for D-04 recovery
    // step 4: reset open file-scheme docs to Parsed + DocumentBuilder.update(...) — KEEP for D-04 recovery
    ...
    connection.window.showInformationMessage('Java classes refreshed'); // step 5 — SKIP (D-05: silent on recovery)
}
```
Extract steps 2-4 into a shared helper called both by the unchanged `bbj/refreshJavaClasses` path
(steps 1-5) and by a new breaker-recovery callback (steps 2-4 only, no `clearCache()`, no popup).

**Isolation rule to copy** — per STATE.md/project memory, this helper must not live in or be
imported into `java-interop.ts` from `main.ts` (importing `main.ts` into shared services crashes
tests). Wire it the same way `bbj-notifications.ts` already isolates its sender:
```typescript
// bbj-notifications.ts — notifyJavaConnectionError is called from establishConnection() on every
// failed connect today (no dedupe); D-05 gates it to fire once per closed->open transition.
```
Add a small event-emitter-shaped API on `JavaInteropService` — e.g. `onBreakerRecovered(callback: () => Promise<void>): void`
— that `java-interop.ts` fires on its own open→closed transition, with `main.ts` as the only file
that knows about `WorkspaceManager`/`DocumentBuilder` and registers the actual reload logic into it
at startup. This mirrors `bbj-notifications.ts`'s existing "module holds a lightweight sender
without pulling in the full main.ts entry point" isolation.

**D-05 dedupe target** — `notifyJavaConnectionError` today fires on every failed connect; wrap its
call site so it fires only on the breaker's closed→open transition, and make a failed half-open
probe log-only (no popup call at all).

---

### `bbj-vscode/src/language/bbj-index-manager.ts` — reverse-path index (RESP-01, D-10)

**Analog:** the file's own existing `isAffected` override (same override style to copy for
`updateContent`/`remove`/`removeContent`), plus Langium's own `DefaultIndexManager.updateContent`.

```typescript
// bbj-index-manager.ts:1-30 — full file today
export class BBjIndexManager extends DefaultIndexManager {
    wsManager: () => WorkspaceManager;
    constructor(services: LangiumSharedCoreServices) {
        super(services);
        this.wsManager = () => services.workspace.WorkspaceManager;
    }
    public override isAffected(document: LangiumDocument<AstNode>, changedUris: Set<string>): boolean {
        if(document.uri.toString() === JavaSyntheticDocUri || document.uri.scheme === 'bbjlib') {
            return false;
        }
        if (this.wsManager() instanceof BBjWorkspaceManager) {
            const bbjWsManager = this.wsManager() as BBjWorkspaceManager;
            const isExternal = bbjWsManager.isExternalDocument(document.uri)
            if(![...changedUris].every(changed => bbjWsManager.isExternalDocument(URI.parse(changed))) && isExternal) {
                return false;
            }
        }
        return super.isAffected(document, changedUris);
    }
}
```

```javascript
// node_modules/langium/lib/workspace/index-manager.js:77-81 — the base method to extend
async updateContent(document, cancelToken = CancellationToken.None) {
    const services = this.serviceRegistry.getServices(document.$document?.uri ?? document.uri);
    const exports = await services.references.ScopeComputation.collectExportedSymbols(document, cancelToken);
    const uri = document.uri.toString();
    this.symbolIndex.set(uri, exports);
```

**Recommended shape:** override `updateContent`/`remove`/`removeContent`, calling `super.*()` first,
then maintaining `private readonly pathIndex = new Map<string /* normalized fsPath, lowercased */, AstNodeDescription[]>()`
populated from `this.symbolIndex.get(document.uri.toString())` filtered to `BbjClass.$type`. Expose
`public getBBjClassesByPath(normalizedPath: string): AstNodeDescription[]` for `bbj-scope.ts`.

**Anti-pattern to avoid** — copy this existing project lesson verbatim:
```typescript
// bbj-document-builder.ts:148-150, 169-170
// BBjCPL integration: compile validated documents based on trigger mode.
// IMPORTANT: Called here inside buildDocuments(), NOT from onBuildPhase —
// onBuildPhase triggers a CPU rebuild loop (see STATE.md).
```
The index-manager override must only write to the private `Map` — never call `DocumentBuilder.update`
or `notifyDocumentPhase` from inside it.

---

### `bbj-vscode/src/language/bbj-scope.ts` — `getBBjClassesFromFile` (RESP-01, D-10)

**Analog:** same file's own current implementation, minimally changed to call the new index.

```typescript
// bbj-scope.ts:308-331 — current O(N) scan
private getBBjClassesFromFile(container: AstNode, bbjFilePath: string, simpleName: boolean) {
    const currentDocUri = AstUtils.getDocument(container).uri;
    const prefixes = this.workspaceManager.getSettings()?.prefixes ?? [];
    const workspaceRoots = this.workspaceManager.getWorkspaceFolderUris();
    const adjustedFileUris = [UriUtils.resolvePath(UriUtils.dirname(currentDocUri), bbjFilePath)]
        .concat(workspaceRoots.map(root => UriUtils.resolvePath(root, bbjFilePath)))
        .concat(prefixes.map(prefixPath => URI.file(resolve(prefixPath, bbjFilePath))));
    let bbjClasses = this.indexManager.allElements(BbjClass.$type).filter(bbjClass => {
        return adjustedFileUris.some(adjustedFileUri => normalize(bbjClass.documentUri.fsPath).toLowerCase() === normalize(adjustedFileUri.fsPath).toLowerCase());
    })
    if (!simpleName) {
        bbjClasses = bbjClasses.map(d => {
            if (d.node) {
                return this.descriptions.createDescription(d.node, `::${bbjFilePath}::${d.name}`);
            }
            // Fallback for synthetic index entries (e.g. regex-extracted classes
            // from files with parser errors) that have no AST node.
            return { ...d, name: `::${bbjFilePath}::${d.name}` };
        });
    }
    return new StreamScopeWithPredicate(bbjClasses);
}
```
Keep the `adjustedFileUris` candidate-path computation and the `simpleName === false` renaming +
synthetic-entry fallback exactly as-is (D-10 requires preserving both). Replace only the
`this.indexManager.allElements(BbjClass.$type).filter(...)` line with per-candidate
`(this.indexManager as BBjIndexManager).getBBjClassesByPath(normalize(adjustedFileUri.fsPath).toLowerCase())`
lookups, merged across `adjustedFileUris`.

---

### `bbj-vscode/src/language/bbj-scope-local.ts` — `collectLocalSymbols` pruning (RESP-01, D-09)

**Analog:** `bbj-vscode/src/language/bbj-linker.ts` `link()` — the exact template to mirror.

```typescript
// bbj-linker.ts:41-69 — the template
override async link(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<void> {
    const started = Date.now()
    const wsManager = this.wsManager()
    const externalDoc = (wsManager instanceof BBjWorkspaceManager)
        && (wsManager as BBjWorkspaceManager).isExternalDocument(document.uri)

    const treeIter = AstUtils.streamAst(document.parseResult.value).iterator()
    for (const node of treeIter) {
        await interruptAndCheck(cancelToken);
        if (externalDoc && isBBjClassMember(node)) {
            if ((node as { visibility?: string }).visibility?.toLowerCase() !== 'private') {
                AstUtils.streamReferences(node).forEach(ref => this.doLink(ref, document));
                // don't link the method body or Field initialization, we are only interested on its signature
                if (isMethodDecl(node)) {
                    node.params.forEach(p => AstUtils.streamReferences(p).forEach(ref => this.doLink(ref, document)))
                }
            }
            treeIter.prune()
        } else {
            AstUtils.streamReferences(node).forEach(ref => this.doLink(ref, document));
        }
    }
    document.state = DocumentState.Linked;
}
```

**Current code to replace** (`bbj-scope-local.ts:106-126`):
```typescript
override async collectLocalSymbols(document: LangiumDocument, cancelToken: CancellationToken): Promise<LocalSymbols> {
    const rootNode = document.parseResult.value;
    const scopes = new MultiMap<AstNode, AstNodeDescription>();
    for (const node of AstUtils.streamAllContents(rootNode)) {
        await interruptAndCheck(cancelToken);
        await this.processNode(node, document, scopes);
    }
    if (isProgram(rootNode)) {
        (document as BbjDocument).cachedUseStatements = collectAllUseStatements(rootNode);
    }
    if (JavaSyntheticDocUri === document.uri.toString() && isClasspath(rootNode)) {
        (document as JavaDocument).classesMapScope = new MapScope(scopes.getStream(rootNode).toArray())
    }
    return scopes;
}
```
Replace `AstUtils.streamAllContents(rootNode)` with `AstUtils.streamAst(rootNode).iterator()`,
compute `externalDoc` the same way the linker does, and prune the member body while still
processing the member's own signature and method params:
```typescript
for (const node of treeIter) {
    await interruptAndCheck(cancelToken);
    if (externalDoc && isBBjClassMember(node)) {
        if ((node as { visibility?: string }).visibility?.toLowerCase() !== 'private') {
            await this.processNode(node, document, scopes);
            if (isMethodDecl(node)) {
                for (const p of node.params) { await this.processNode(p, document, scopes); }
            }
        }
        treeIter.prune();
    } else {
        await this.processNode(node, document, scopes);
    }
}
```
Keep the two post-loop reads (`cachedUseStatements`, `classesMapScope`) unconditional, exactly as
today — D-09 requires no change there. **Import note:** `isBBjClassMember` must be added to this
file's imports from `./generated/ast.js` (currently only imported in `bbj-linker.ts`).

---

### `bbj-vscode/src/language/bbj-completion-provider.ts` — AsyncLocalStorage (RESP-04, D-11)

**Analog:** the file's own current `activeCancelToken` field/usages, to be replaced in place.

```typescript
// bbj-completion-provider.ts:53-59 — field to remove
protected activeCancelToken?: CancellationToken;
```
```typescript
// bbj-completion-provider.ts:94-104 — read site to change
protected override async completionForCrossReference(context: CompletionContext, next: NextFeature<GrammarAST.CrossReference>, acceptor: CompletionAcceptor): Promise<void> {
    const offered = new Set<string>();
    const recording: CompletionAcceptor = (ctx, item) => { if (item.label) { offered.add(item.label); } acceptor(ctx, item); };
    await super.completionForCrossReference(context, next, recording);
    if (!this.dotTriggerActive && this.isClassCrossReference(next.feature) && this.isTypeReferencePosition(context)) {
        await this.completeAutoImportClasses(context, offered, acceptor, this.activeCancelToken);
    }
}
```
```typescript
// bbj-completion-provider.ts:247 — write site to change (inside getCompletion)
this.activeCancelToken = cancelToken;
```
**Replacement:**
```typescript
import { AsyncLocalStorage } from 'node:async_hooks';
const completionTokenStorage = new AsyncLocalStorage<CancellationToken | undefined>();
```
Wrap `getCompletion`'s body (or just the `super.getCompletion` call sites) with
`completionTokenStorage.run(cancelToken, () => { ... })`; replace every `this.activeCancelToken`
read with `completionTokenStorage.getStore()`.

**Second-layer fix — `autoImportPrefixCache`** (`bbj-completion-provider.ts:178-204`):
```typescript
protected findClassCandidatesByPrefixCached(prefix: string, cancelToken?: CancellationToken): Promise<string[]> {
    const key = prefix.toLowerCase();
    const now = Date.now();
    const cached = this.autoImportPrefixCache.get(key);
    if (cached && (now - cached.cachedAt) < AUTO_IMPORT_PREFIX_CACHE_TTL_MS) {
        this.autoImportPrefixCache.delete(key);
        this.autoImportPrefixCache.set(key, cached);
        return cached.promise;
    }
    const promise = this.javaInterop.findClassCandidatesByPrefix(prefix, undefined, cancelToken);
    this.autoImportPrefixCache.set(key, { promise, cachedAt: now });
    promise.catch(() => { this.autoImportPrefixCache.delete(key); });
    ...
    return promise;
}
```
Fix: create the underlying fetch with no per-caller token (`undefined` / `CancellationToken.None`)
so the shared promise's lifetime is decoupled from any individual caller. The existing post-await
check already covers per-caller cancellation:
```typescript
// bbj-completion-provider.ts:145-148
const fqns = await this.findClassCandidatesByPrefixCached(prefix, cancelToken);
if (cancelToken?.isCancellationRequested) {
    return;
}
```

## Shared Patterns

### "Never import main.ts into a shared service" isolation
**Source:** `bbj-vscode/src/language/bbj-notifications.ts` (existing sender module) +
`bbj-vscode/src/language/main.ts` `reloadJavaClassesAndRevalidate()`
**Apply to:** D-04's breaker-recovery wiring and D-05's popup dedupe — `java-interop.ts` must expose
a callback-registration seam (`onBreakerRecovered`), never import `main.ts` directly (breaks tests
per project memory/STATE.md).

### `finally`-scoped cleanup covering every exit path
**Source:** `bbj-vscode/src/language/java-interop.ts` `resolveClassByName`'s existing
`try { return await resolutionPromise; } finally { this._pendingResolutions.delete(className); }`
**Apply to:** D-07's `_inFlightPhase2` registry — the new map's cleanup must use the same
try/finally shape, not an ad-hoc cleanup after only the success branch.

### Subclass-override test seam for injecting fakes
**Source:** `bbj-vscode/test/java-interop-service.test.ts:71-76` (`MockableJavaInteropService`
overriding `createSocket()`), `bbj-vscode/test/java-interop-timeouts.test.ts:24-33`
(`HangingBackendInterop` overriding `connect()`), both combined with `vi.useFakeTimers()` /
`vi.advanceTimersByTimeAsync()`.
**Apply to:** all of D-13's RESP-02/03/04 fake-peer tests, and RESP-03's forced-eviction seam
(`createResolvedClassesLru()` factory method override).

### `AstUtils.streamAst(...).iterator()` + `treeIter.prune()` for external-document walks
**Source:** `bbj-vscode/src/language/bbj-linker.ts` `link()`
**Apply to:** `bbj-scope-local.ts` `collectLocalSymbols()` (D-09) — same iterator API, same
`isExternalDocument()` + `isBBjClassMember()` gate, same prune point.

### Read-only index maintenance, never triggering a rebuild
**Source:** `bbj-vscode/src/language/bbj-document-builder.ts:148-150,169-170` comment (existing
project lesson: `onBuildPhase` calling `DocumentBuilder.update`/`notifyDocumentPhase` causes a CPU
rebuild loop) + `main.ts:162`'s existing safe `onBuildPhase(DocumentState.Validated, ...)` (read/notify
only)
**Apply to:** `bbj-index-manager.ts`'s new reverse-path index maintenance in `updateContent`/
`remove`/`removeContent` — write only to the private `Map`, never call a rebuild-triggering API.

## No Analog Found

None — all nine modified-file/pattern combinations have a strong same-file or same-repo analog;
RESEARCH.md's own file:line archaeology already supplied the exact excerpts.

## Metadata

**Analog search scope:** `bbj-vscode/src/language/` (production LS code), `bbj-vscode/test/`
(existing timeout/service/completion test patterns); Langium's installed `node_modules/langium`
base classes consulted for override signatures only (not copied as source, since they are
third-party, not project code).
**Files scanned:** 8 production files + 5 test files (all confirmed git-tracked via `git ls-files`).
**Pattern extraction date:** 2026-09-12
