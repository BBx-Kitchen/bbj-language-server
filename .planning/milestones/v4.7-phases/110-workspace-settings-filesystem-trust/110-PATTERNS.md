# Phase 110: Workspace Settings & Filesystem Trust - Pattern Map

**Mapped:** 2026-09-26
**Files analyzed:** 11 new/modified source files (+ 6 test files)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/src/language/interop-config.ts` (NEW) | utility (plain module) | transform (validate + default-fallback) | `bbj-vscode/src/language/config-path-resolver.ts` | exact — same injectable-deps, Langium-free shape |
| `bbj-vscode/src/language/path-containment.ts` (NEW) | utility (plain module) | transform (path predicate) | `bbj-vscode/src/language/config-path-resolver.ts` (`samePath`) | exact — same platform-branch pattern |
| `bbj-vscode/src/formatter-java-resolver.ts` (NEW) | utility (plain module) | transform + file-I/O (resolve+verify before spawn) | `bbj-vscode/src/bbj-home-layout.ts` (`isExecutableFile`, `resolveBbjBinary`) | exact — same "resolve or explain why not" result shape |
| `bbj-vscode/src/config-path-trust.ts` (NEW, suggested name) | utility (client-only) | transform (trust-gated read) | `bbj-vscode/src/language/config-path-resolver.ts` | role-match — sibling injectable module, but this one wraps `vscode.workspace` instead of `fs` |
| `bbj-vscode/src/language/bbj-ws-manager.ts` (MODIFIED) | service/provider (workspace manager) | request-response (init options) + CRUD (external-doc check) | itself (existing file, modify in place) | exact — edit existing call sites |
| `bbj-vscode/src/language/main.ts` (MODIFIED) | service (LSP entry point) | event-driven (`onDidChangeConfiguration`) | itself | exact |
| `bbj-vscode/src/language/java-interop.ts` (MODIFIED) | service | request-response (`setConnectionConfig`) | itself | exact |
| `bbj-vscode/src/language/bbj-document-builder.ts` (MODIFIED) | service (document builder) | file-I/O (`addImportedBBjDocuments`) | itself | exact |
| `bbj-vscode/src/language/bbj-scope.ts` (MODIFIED) | service (scope provider) | CRUD (index lookup, `getBBjClassesFromFile`) | itself | exact |
| `bbj-vscode/src/decompile-io.ts` (MODIFIED) | utility (file probes) | file-I/O | itself | exact |
| `bbj-vscode/src/document-formatter.ts` (MODIFIED) | service (client-side formatter) | event-driven (spawn on format command) | itself | exact |
| `bbj-vscode/src/extension.ts` (MODIFIED) | provider (extension activation) | request-response (LSP client config) | itself | exact |
| `bbj-vscode/package.json` (MODIFIED) | config | n/a | itself (`bbj.formatter.*` block) | exact |

## Pattern Assignments

### `bbj-vscode/src/language/interop-config.ts` (utility, transform) — NEW

**Analog:** `bbj-vscode/src/language/config-path-resolver.ts` (full file, injectable-deps pattern)

**Module shape to copy (verified from analog):**
```typescript
// Source: bbj-vscode/src/language/config-path-resolver.ts
export interface ConfigPathProbeDeps {
    fileExists?: (path: string) => boolean;
    realPath?: (path: string) => string;
    homeDir?: () => string;
}

export function resolveConfigPath(input: ResolveConfigPathInput, deps: ConfigPathProbeDeps = {}): ResolvedConfigPath {
    const fileExists = deps.fileExists ?? defaultFileExists;
    const homeDir = deps.homeDir ?? os.homedir;
    // ...
}
```
Header comment convention in the analog: "Kept free of Langium and editor imports" — replicate verbatim as the header comment for `interop-config.ts`.

**Exact call sites this module must replace (D-01/D-02/D-04, REF-02):**
```typescript
// Source: bbj-vscode/src/language/bbj-ws-manager.ts:72-74
const interopHost = params.initializationOptions.interopHost || 'localhost';
const interopPort = params.initializationOptions.interopPort || 5008;
this.javaInterop.setConnectionConfig(interopHost, interopPort);
```
```typescript
// Source: bbj-vscode/src/language/main.ts:263-264,275
const newInteropHost = config.interop?.host || 'localhost';
const newInteropPort = config.interop?.port || 5008;
// ...
javaInterop.setConnectionConfig(newInteropHost, newInteropPort);
```
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:489-493
public setConnectionConfig(host: string, port: number): void {
    this.interopHost = host || '127.0.0.1';
    this.interopPort = port || 5008;
    logger.debug(`Java interop connection config: ${this.interopHost}:${this.interopPort}`);
}
```
All three fallback literals collapse into one call to the new validator; `setConnectionConfig` calls it itself so no caller can bypass validation (D-01).

**Error handling / logging:** `warn` level for rejected values naming the setting and rejected value (D-03); `undefined`/`null` falls back silently. Follow the existing `logger` import convention used in `java-interop.ts` (`logger.debug(...)`).

---

### `bbj-vscode/src/language/path-containment.ts` (utility, transform) — NEW

**Analog:** `bbj-vscode/src/language/config-path-resolver.ts` (`samePath` function)

**Platform-branch pattern to copy:**
```typescript
// Source: bbj-vscode/src/language/config-path-resolver.ts
export function samePath(a: string, b: string): boolean {
    const na = a.normalize('NFC');
    const nb = b.normalize('NFC');
    if (process.platform === 'win32' || process.platform === 'darwin') {
        return na.toLowerCase() === nb.toLowerCase();
    }
    return na === nb;
}
```
D-10 narrows this to Windows-only (`process.platform === 'win32'`), not `win32 || darwin` — confirm this narrower scope when implementing; do not copy the darwin branch.

**Core predicate (from Don't Hand-Roll / D-10):** use `path.relative(root, candidate)`; outside iff the result is absolute or starts with `..` + separator (or is exactly `'..'`).

**Consumers (exact insertion points, D-11/D-12/D-15):**
```typescript
// Source: bbj-vscode/src/language/bbj-document-builder.ts:1114-1129 (addImportedBBjDocuments)
for (const importPath of bbjImports) {
    let docFileData;
    for (const prefixPath of prefixes) {
        const prefixedPath = URI.file(resolve(prefixPath, importPath));
        try {
            const fileContent = await fsProvider.readFile(prefixedPath);
            docFileData = { uri: prefixedPath, text: fileContent };
            break; // early stop iterating prefixes when file is found
        } catch (e) {
            // File not found at this prefix, try next
        }
    }
    // ...
}
```
Insert `if (!isPathInside(prefixPath, prefixedPath.fsPath)) continue;` immediately after computing `prefixedPath`, before the `try`/`readFile` call.

```typescript
// Source: bbj-vscode/src/language/bbj-scope.ts:330-339 (getBBjClassesFromFile)
private getBBjClassesFromFile(container: AstNode, bbjFilePath: string, simpleName: boolean) {
    const currentDocUri = AstUtils.getDocument(container).uri;
    const prefixes = this.workspaceManager.getSettings()?.prefixes ?? [];
    const workspaceRoots = this.workspaceManager.getWorkspaceFolderUris();
    const adjustedFileUris = [UriUtils.resolvePath(UriUtils.dirname(currentDocUri), bbjFilePath)]
        .concat(workspaceRoots.map(root => UriUtils.resolvePath(root, bbjFilePath)))
        .concat(prefixes.map(prefixPath => URI.file(resolve(prefixPath, bbjFilePath))));
    let bbjClasses = stream((this.indexManager as BBjIndexManager).getBBjClassesForFiles(adjustedFileUris));
    // ...
}
```
Only the third `.concat(...)` (prefix-derived) is filtered with `isPathInside`; the first two candidates stay unchanged (D-12).

```typescript
// Source: bbj-vscode/src/language/bbj-ws-manager.ts:~277 (isExternalDocument, D-15 target)
// Current: fsPath.startsWith(URI.file(prefix).fsPath)  — the ONE hand-rolled startsWith in the repo (confirmed by grep). Replace with isPathInside.
```

**Anti-pattern to avoid (explicit in RESEARCH.md):** no second hand-rolled `startsWith` check anywhere; no `fs.realpathSync` on USE-path candidates (containment is lexical only, D-13).

---

### `bbj-vscode/src/formatter-java-resolver.ts` (utility, transform + file-I/O) — NEW

**Analog:** `bbj-vscode/src/bbj-home-layout.ts` (`isExecutableFile`, `resolveBbjBinary`)

**Reusable check (verified, full body):**
```typescript
// Source: bbj-vscode/src/bbj-home-layout.ts:54-64
function isExecutableFile(p: string): boolean {
    try {
        if (!fs.statSync(p).isFile()) {   // follows symlinks — matches D-19's "after following symlinks"
            return false;
        }
        fs.accessSync(p, fs.constants.X_OK);   // on Windows, X_OK degrades to an existence check
        return true;
    } catch {
        return false;
    }
}
```
This already satisfies D-19 exactly (absolute, exists, regular file after following symlinks, executable via X_OK, Windows existence-only for free). Either export it from `bbj-home-layout.ts` for reuse or duplicate the ~10-line body.

**Result-shape pattern to copy (`{ path?: string; reason?: string }`):**
```typescript
// Source: bbj-vscode/src/bbj-home-layout.ts:89-122 (resolveBbjBinary, full function)
export function resolveBbjBinary(
    bbjHome: string,
    binary: BbjBinaryName,
    platform: NodeJS.Platform = process.platform
): BbjBinaryResolution {
    if (!path.isAbsolute(bbjHome)) {
        return { reason: REASON_NOT_ABSOLUTE };
    }
    if (!isDirectorySync(bbjHome)) {
        return { reason: REASON_NOT_DIRECTORY };
    }
    const requested = path.join(bbjHome, 'bin', suffixed(binary, platform));
    if (!isExecutableFile(requested)) {
        return { reason: REASON_REQUESTED_NOT_EXECUTABLE };
    }
    return { path: requested };
}
```
D-19/D-20's javaPath resolver should return this same "exactly one of path/reason set" shape; the D-19 error path reuses the existing verification-refusal messaging convention (see `formatter-verifier.ts`).

**Call site to replace (D-19/D-20):**
```typescript
// Source: bbj-vscode/src/document-formatter.ts:144
const p = cp.spawn('java', formatFlags);
```

**Stale comment to update (Pitfall 4):**
```typescript
// Source: bbj-vscode/test/no-shell-command-construction.test.ts:82-92
/**
 * ... document-formatter.ts is on the list because it runs
 * `java` from PATH, not a path derived from a configured setting.   <- update after SEC-09
 */
```
The assertion (`toEqual(['Commands/process-runner.ts', 'document-formatter.ts', 'language/bbj-cpl-service.ts'])`) does not need to change, only the comment text.

**PATH-walk (D-20):** no existing repo precedent; write a ~15-line function splitting `process.env.PATH` on `path.delimiter`, applying `PATHEXT` on win32, with injected fs/env probes (same injectable-deps convention as `config-path-resolver.ts`).

---

### `bbj-vscode/src/config-path-trust.ts` (utility, client-only) — NEW (suggested name, Claude's Discretion)

**Analog:** `bbj-vscode/src/language/config-path-resolver.ts` for the injectable-module shape; no existing `vscode.workspace.isTrusted` consumer exists in-repo as a direct analog (new capability).

**Exact current hand-off code this helper replaces (D-06):**
```typescript
// Source: bbj-vscode/src/extension.ts:1097-1104
initializationOptions: {
    version: context.extension.packageJSON.version,
    home: vscode.workspace.getConfiguration("bbj").get("home"),
    classpath: vscode.workspace.getConfiguration("bbj").get("classpath"),
    typeResolutionWarnings: vscode.workspace.getConfiguration("bbj").get("typeResolution.warnings", true),
    configPath: vscode.workspace.getConfiguration("bbj").get("configPath", null),  // <- D-06 replaces this line
    interopHost: vscode.workspace.getConfiguration("bbj").get("interop.host", "localhost"),
    interopPort: vscode.workspace.getConfiguration("bbj").get("interop.port", 5008),
    // ...
```
```typescript
// Source: bbj-vscode/src/extension.ts:1092-1096
synchronize: {
    fileEvents: fileSystemWatcher,
    configurationSection: 'bbj'   // <- second live path, needs the same gate (Pitfall 1, Open Question 1)
},
```

**Push-path constraint (must be respected in the implementation, from vscode-languageclient 10.1.0 source read this session):**
```typescript
// Source: bbj-vscode/node_modules/vscode-languageclient/lib/common/configuration.js
const didChangeConfiguration = async (sections) => {
    if (sections === undefined) {
        return this._client.sendNotification(DidChangeConfigurationNotification.type, { settings: null });
    } else {
        return this._client.sendNotification(DidChangeConfigurationNotification.type, {
            settings: this.extractSettingsInformation(sections)
        });
    }
};
```
`middleware.workspace.didChangeConfiguration`'s `next(sections)` re-derives values from `vscode.workspace.getConfiguration()` itself — it cannot substitute a single field. D-21 (settled after research) requires: don't call `next()`; build the `bbj` section manually, replace `configPath` with the helper's effective value, and call `sendNotification(DidChangeConfigurationNotification.type, { settings: { bbj: … } })` directly. Apply the same substitution in `middleware.workspace.configuration` for pull-model requests.

**Test pattern:** `bbj-vscode/test/document-formatter.test.ts` establishes the `vi.mock('vscode', ...)` stubbing convention already used in this repo (lines 1-80) — reuse it to stub `vscode.workspace.isTrusted`, `.inspect()`, `.onDidGrantWorkspaceTrust`.

---

### `bbj-vscode/src/decompile-io.ts` (MODIFIED, file-I/O)

**Analog:** itself — existing file, harden in place; test fixture pattern from `bbj-vscode/test/decompile-io.test.ts` (full file, `fs.mkdtempSync` + `beforeEach`/`afterEach`).

**Exact current code (D-16/D-17 targets):**
```typescript
// Source: bbj-vscode/src/decompile-io.ts:16-41
export async function isTokenizedFile(file: string): Promise<boolean> {
    let handle: fs.promises.FileHandle | undefined;
    try {
        handle = await fs.promises.open(file, 'r');   // <- needs lstat-first + O_NOFOLLOW|O_NONBLOCK
        const buffer = Buffer.alloc(TOKENIZED_MAGIC.length);
        const { bytesRead } = await handle.read(buffer, 0, TOKENIZED_MAGIC.length, 0);
        return bytesRead === TOKENIZED_MAGIC.length && buffer.equals(TOKENIZED_MAGIC);
    } catch {
        return false;
    } finally {
        await handle?.close().catch(() => { });
    }
}

async function statSize(file: string): Promise<FileSize | undefined> {
    try {
        const stat = await fs.promises.stat(file);   // <- needs to become fs.promises.lstat + isFile() check
        return { size: stat.size };
    } catch {
        return undefined;
    }
}
```

**Windows pitfall (explicit, Pitfall 5):** `fs.constants.O_NOFOLLOW`/`O_NONBLOCK` are `undefined` on win32; `undefined | x` silently coerces to `0` via bitwise-OR. Implement an explicit `typeof fs.constants.O_NOFOLLOW === 'number'` branch, not implicit coercion.

---

## Shared Patterns

### Injectable plain module (established repo-wide convention)
**Source:** `bbj-vscode/src/language/config-path-resolver.ts`, `bbj-vscode/src/bbj-home-layout.ts`
**Apply to:** every new module this phase adds (`interop-config.ts`, `path-containment.ts`, `formatter-java-resolver.ts`, `config-path-trust.ts`)
- No Langium or editor imports (header comment states this explicitly in the analog — copy the convention)
- Exported pure functions with an optional `deps` parameter carrying fs/env/vscode probes, defaulting to real implementations
- `{ path?: string; reason?: string }`-style discriminated result for "resolve or explain why not" functions

### "Resolve or explain why not" result shape
**Source:** `bbj-vscode/src/bbj-home-layout.ts:89-122` (`resolveBbjBinary`, `BbjBinaryResolution`)
**Apply to:** `formatter-java-resolver.ts` (D-19/D-20)

### Path containment via `path.relative`, never `startsWith`
**Source:** D-10 decision + RESEARCH.md Don't Hand-Roll table
**Apply to:** `bbj-document-builder.ts`, `bbj-scope.ts`, `bbj-ws-manager.ts` — all three must import the single `isPathInside` from `path-containment.ts`; no local reimplementation.

### TOCTOU-safe file probing
**Source:** D-17, Node `fs.constants` availability notes in RESEARCH.md
**Apply to:** `decompile-io.ts` only — `lstat` → `isFile()` check → `open(O_NOFOLLOW|O_NONBLOCK)` where defined → `fstat()` re-check.

### Test harness conventions (apply to every new/extended test file)
- `parseHelper`-style setup with `EmptyFileSystem`/injected `FileSystemProvider`, never `DocumentBuilder.build` (reaches :5008) — canonical example: `bbj-vscode/test/lazy-prefix-loading.test.ts` (full file, spy `InMemoryFileSystemProvider` + injected `prefixes`).
- `vi.mock('vscode', ...)` stubbing convention — canonical example: `bbj-vscode/test/document-formatter.test.ts` (lines 1-80).
- Temp-dir fixture convention (`fs.mkdtempSync(path.join(os.tmpdir(), '<name>-test-'))` + `beforeEach`/`afterEach`) — canonical example: `bbj-vscode/test/decompile-io.test.ts`.
- All commands run with cwd = `bbj-vscode` (`cd .../bbj-vscode && npx vitest run <file>` or `npm --prefix .../bbj-vscode test`); never `--reporter=basic`.
- No planning IDs (D-xx, plan numbers) in source or test comments; issue numbers (#509 etc.) are fine.

## No Analog Found

None — every file in scope either has a direct existing-file analog (modify in place) or a clear sibling-module template (`config-path-resolver.ts` / `bbj-home-layout.ts`) confirmed by RESEARCH.md's own Gate readings.

## Metadata

**Analog search scope:** `bbj-vscode/src/`, `bbj-vscode/src/language/`, `bbj-vscode/test/` (informed primarily by 110-RESEARCH.md's own Gate-by-Gate file reads, cross-checked with `git ls-files` for tracked-source status)
**Files scanned:** 11 source analogs + 6 test analogs (all confirmed git-tracked)
**Pattern extraction date:** 2026-09-26
