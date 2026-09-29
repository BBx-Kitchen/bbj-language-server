# Phase 110: Workspace Settings & Filesystem Trust - Research

**Researched:** 2026-09-26
**Domain:** VS Code extension client/server trust boundaries, path containment, filesystem probes, process spawning
**Confidence:** HIGH

## Summary

This phase closes six independent "a workspace-controlled value reaches somewhere the user
didn't choose" gaps in an existing, mature codebase. Every touch point named in the roadmap's
Code line was read this session and the exact current code is quoted below — there is no
guesswork about line numbers or existing behavior. Three findings materially affect planning:

1. **D-08 is confirmed exactly as hypothesized.** `bbj-vscode/package.json` has no
   `capabilities` block at all, so per VS Code's own extension-guide docs the extension is
   "treated as not supporting Workspace Trust" and is disabled outright in Restricted Mode —
   it never runs untrusted today. Adding `restrictedConfigurations: ["bbj.configPath"]` would
   be inert given today's (missing) `untrustedWorkspaces` capability, so D-08's own fallback
   applies: ship the D-06 client helper, verify with a stubbed `vscode.workspace`, and do not
   add a `capabilities` block this phase.
2. **The `synchronize.configurationSection: 'bbj'` push is a second live path, and its
   values come straight from `vscode.workspace.getConfiguration()`, not from `initializationOptions`.**
   Reading `vscode-languageclient@10.1.0`'s own `configuration.js` shows the push notification
   carries real settings values (not just a change signal), and its `middleware.workspace.didChangeConfiguration`
   hook cannot substitute a single field's value through `next()` — only the pull-model
   `middleware.workspace.configuration` hook can rewrite a returned value cleanly. This is a
   concrete implementation constraint for D-06, detailed in Gate 1 below.
3. **D-13's scan found nothing that breaks.** No `..`-segment or absolute/drive-letter USE
   path exists anywhere in `examples/` or `bbj-vscode/test/` (bbj files or `.ts` fixtures) that
   resolves through a PREFIX. The only absolute-path USE statements found (`classes.test.ts`
   lines 77, 92) exercise the **document-relative** candidate in `bbj-scope.ts`
   (`getBBjClassesFromFile`), which D-12 explicitly exempts from containment — confirmed by
   reading the function.

A fourth, unscoped finding surfaced during Gate 6 (SEC-01 consumers): **IntelliJ's
`initializationOptions` sends `javaInteropHost`/`javaInteropPort`, but the language server only
ever reads `interopHost`/`interopPort`.** This is a pre-existing key-name mismatch, not one of
the eight closed issues, and is out of scope to fix in this phase — see Open Questions.

**Primary recommendation:** Follow every D-01..D-20 decision as written; three plain,
Langium-free modules (interop validator, path-containment helper, decompile/formatter probes)
plus one client-side trust helper. No new dependencies. Reuse `bbj-home-layout.ts`'s
`isExecutableFile` pattern (`statSync().isFile()` + `accessSync(X_OK)`) for D-19 rather than
writing a new one from scratch.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Interop host/port validation (SEC-01) | API/Backend (language server) | Frontend Server (VS Code client passes raw values) | Server validates once so both IDE hosts are covered without duplicating logic client-side (D-01) |
| `configPath` Workspace Trust gate (SEC-02) | Frontend Server (VS Code client, `extension.ts`) | — | `vscode.workspace.isTrusted`/`inspect()` are client-only APIs; the server has no trust concept |
| USE-path containment (SEC-06) | API/Backend (`bbj-document-builder.ts`, `bbj-scope.ts`) | — | File reads and index lookups happen server-side; client never resolves USE paths |
| Prefix membership on segment boundaries (SEC-07) | API/Backend (`bbj-ws-manager.ts`) | — | `isExternalDocument()` gates document-builder/linker/scope behavior server-side |
| Decompile probe hardening (SEC-08) | Frontend Server (`bbj-vscode/src/decompile-io.ts`, driven by `Commands.cjs` in the extension host) | — | Runs inside the extension host process, not the language server |
| Formatter Java binary (SEC-09) | Frontend Server (`document-formatter.ts`, VS Code client only) | — | Confirmed: not imported by `bbj-intellij`; IntelliJ has no formatter feature in scope |
| Interop defaults consolidation (REF-02) | API/Backend (shared module used by both server entry points) | — | Collapses `bbj-ws-manager.ts` and `main.ts`'s duplicated fallback literals |

## User Constraints

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Interop host/port validation (SEC-01, REF-02)**
- **D-01:** Add one small plain module (no Langium or editor imports, like `config-path-resolver.ts`)
  that exports the only copy of the defaults (`DEFAULT_INTEROP_HOST`, `DEFAULT_INTEROP_PORT`) and a
  validator `(host: unknown, port: unknown) => { host, port }` that reports what it replaced.
  Both entry points (`bbj-ws-manager.ts` initialization options, `main.ts` configuration-change
  handler) stop carrying `|| 'localhost'` / `|| 5008`, and `setConnectionConfig` stops carrying
  `|| '127.0.0.1'`. `setConnectionConfig` calls the validator itself, so no caller can bypass it.
- **D-02:** The single default host is `'localhost'`. That is what `package.json` declares and what
  both call sites actually pass today; `'127.0.0.1'` in `setConnectionConfig` was only reached for
  an empty host. Port default stays `5008`.
- **D-03:** Valid host = a string that is non-empty after trimming (the trimmed value is used).
  Valid port = a JavaScript number that is an integer from 1 to 65535. A numeric string such as
  `"5008"` is invalid and falls back. `undefined`/`null` (setting absent) falls back to the default
  **silently**. Any other invalid value falls back and logs one warning naming the setting and the
  rejected value.
- **D-04:** Fallback is per field. An invalid port with a valid host uses the configured host and
  the default port, and vice versa. This is how criterion 1 is read ("use the default host and
  port" applies to whichever of the two was invalid); a test covers each field on its own and both
  together, through both entry paths.

**Workspace Trust gate for `bbj.configPath` (SEC-02)**
- **D-05:** Do not add containment to `configPath`. Issue #511 proposes that, but the roadmap
  overrides it: `configPath` stays un-anchored so that system-wide config files keep working, and
  only the *workspace-scoped* value is gated behind Workspace Trust. Carried forward from the
  v4.7 roadmap decision. — Reversibility: reversible — client-side only.
- **D-06:** The gate lives in the VS Code client, in one helper that computes the effective
  `configPath`: if `vscode.workspace.isTrusted` is false, take `inspect('configPath')`'s
  `globalValue`, else the default (`null`). `workspaceValue` and `workspaceFolderValue` are ignored.
  If the workspace is trusted, it returns `get()` exactly as today. Every place the client hands
  `configPath` to the server uses this helper: `initializationOptions` in `extension.ts`, and the
  `synchronize.configurationSection: 'bbj'` push (through a `middleware.workspace` hook that swaps
  in the effective value, or an equivalent the researcher confirms). The client-local
  config-association sweep reads the same helper, or reads the server's resolved path, which is
  already gated.
- **D-07:** When trust is granted (`vscode.workspace.onDidGrantWorkspaceTrust`), the client pushes
  the configuration again so that the workspace value takes effect without a reload. The existing
  server `onDidChangeConfiguration` path re-resolves the config path and re-arms the watcher.
- **D-08 (research gate):** `bbj-vscode/package.json` declares no `capabilities.untrustedWorkspaces`
  today. The researcher must confirm what VS Code does for an extension without that declaration
  (believed: treated as `supported: false`, so the extension does not activate in Restricted Mode).
  The phase must **not** widen what the extension does in Restricted Mode. If the extension already
  runs untrusted, also declare `restrictedConfigurations: ["bbj.configPath"]` next to the helper. If
  it does not run untrusted, the helper still ships as the gate (it covers any future `limited`
  declaration and the trust-granted transition), and the plan states plainly that criterion 2 is
  shown by unit tests with a stubbed `vscode.workspace`, not by a live Restricted Mode session.
  — Reversibility: costly — a `limited` or `true` declaration changes what runs in untrusted
  workspaces for every user; do not add one in this phase.
- **D-09:** IntelliJ is unchanged. Its `configPath` handoff has no trust concept in scope (roadmap
  note).

**USE-path containment (SEC-06)**
- **D-10:** One shared, plain path helper `isPathInside(root, candidate)` decides containment on
  normalized paths using `path.relative` semantics: the relative path is not absolute, is not `..`,
  and does not start with `..` + separator. On Windows the comparison is case-insensitive. SEC-06
  and SEC-07 both use it. There is no second hand-rolled `startsWith` check.
- **D-11:** In `bbj-document-builder.ts` `addImportedBBjDocuments`, each candidate
  `resolve(prefixPath, importPath)` is read only if it lies inside *that* prefix root. Otherwise
  the builder skips it without calling `fsProvider.readFile`, and resolution continues with the
  next prefix. If no prefix yields a contained file, the existing "could not be resolved"
  diagnostic applies unchanged. There is no new diagnostic text.
- **D-12:** In `bbj-scope.ts` `getBBjClassesFromFile`, the prefix-derived candidate URIs get the
  same filter. The document-relative and workspace-root candidates (#378) are unchanged. They do
  not read files (they query the index), and the requirement names PREFIX roots only.
- **D-13:** Containment is lexical, on the resolved path. Symlinks are not resolved. The threat is
  `..` or an absolute path in source text. A symlink inside a prefix directory is the user's own
  filesystem layout. An absolute USE path is accepted only if it lies inside a prefix root. The
  researcher checks `examples/` and `test/test-data/` for absolute or `..` USE paths that would
  stop resolving, and reports any such path before planning. — Reversibility: reversible.
- **D-14:** Test: drive `addImportedBBjDocuments` with a spy `FileSystemProvider` and a prefix
  list. Assert that no `readFile` call targets a path outside the roots (a `../` escape and an
  absolute path), and that an in-root import still loads. Follow the project rule of using
  `parseHelper`-style setup, not `DocumentBuilder.build`, so the test never reaches :5008.

**Prefix membership on segment boundaries (SEC-07)**
- **D-15:** `isExternalDocument()` in `bbj-ws-manager.ts` uses `isPathInside` from D-10 instead of
  `fsPath.startsWith`. `/libs/foo2/x.bbj` is not inside `/libs/foo`. `/libs/foo/x.bbj` and the
  prefix directory itself (with or without a trailing separator) still are. Empty prefixes are
  still skipped. The stale `// TODO check that document is part of the workspace folders` stays
  out of scope.

**Non-regular files in decompile probes (SEC-08)**
- **D-16:** `statSize` uses `lstat` and returns `undefined` unless `isFile()` is true. Symlinks,
  directories, FIFOs, sockets and devices all count as not-a-file.
- **D-17:** `isTokenizedFile` calls `lstat` first and returns `false` unless `isFile()` is true.
  It never opens a FIFO, which would block. It then opens with `O_NOFOLLOW | O_NONBLOCK` where the
  platform defines them. On Windows, where they are undefined, it opens plainly after the `lstat`
  check. It re-checks with `fstat().isFile()` on the handle to close the swap window. Tests create
  a real symlink, a directory and a FIFO in a temp dir (the FIFO test is skipped on Windows).

**Formatter Java binary (SEC-09)**
- **D-18:** New setting `bbj.formatter.javaPath` (string, default `""`), placed with the other
  `bbj.formatter.*` settings. Its scope is **`machine`**, so a workspace `.vscode/settings.json`
  cannot choose the binary to be spawned. The description says it is an absolute path to a `java`
  executable and that empty means "look up `java` on PATH". — Reversibility: costly — setting
  names and scopes are a user-facing contract once shipped.
- **D-19:** When `javaPath` is set, the formatter checks that it is absolute, exists, is a regular
  file (after following symlinks, since JDK installs commonly symlink `java`) and is executable
  (`fs.accessSync(X_OK)`; on Windows existence only). It then spawns that exact path. If the value
  is invalid, the formatter shows `vscode.window.showErrorMessage` naming the configured path and
  the reason, and does not format. It never falls back to PATH.
- **D-20:** When `javaPath` is empty, the formatter resolves `java` itself by walking `PATH` (and
  `PATHEXT` on Windows), applies the D-19 check to the first hit, and spawns the absolute path it
  found. If nothing is found, it shows an error message saying `java` was not found on PATH and
  naming the setting. The resolution and check live in a plain function with injected fs/env probes
  for unit tests. They sit next to the existing per-spawn SHA-256 JAR verification, which stays
  unchanged. The error surface matches the existing verification refusal path.

### Claude's Discretion
- Plan split and file names for the two new plain modules (interop config, path containment).
  Suggested grouping: (1) interop validator + REF-02, (2) path helper + SEC-06 + SEC-07,
  (3) decompile probes + formatter Java binary, (4) Workspace Trust gate. Waves are the planner's
  call. Plans 1-3 touch disjoint files.
- Exact warning and error message wording, and logger level (`warn` for SEC-01 fallbacks).
- Whether the trust helper lives in `extension.ts` or a small sibling module (a sibling is easier
  to unit-test with a stubbed `vscode`).

### Deferred Ideas (OUT OF SCOPE)
- Containment of `bbj.configPath` to the workspace root (#511's own proposal): rejected by roadmap
  decision, not deferred.
- An explicit `untrustedWorkspaces` `limited` declaration that would make the extension run in
  Restricted Mode: a separate product decision, not this phase (D-08).
- The `isExternalDocument()` TODO about workspace-folder membership: not required by SEC-07.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | Interop host/port validated in one shared place; invalid falls back to defaults with a logged warning | D-01 module confirmed as a `config-path-resolver.ts`-style plain module; exact current fallback code at both entry points read and quoted (Gate 6/7) |
| SEC-02 | Workspace-level `bbj.configPath` ignored in untrusted workspace; user-level unaffected | D-08 gate resolved — extension is not supported in Restricted Mode today; VS Code API surface (`isTrusted`, `inspect`, `onDidGrantWorkspaceTrust`) confirmed present in `@types/vscode` 1.101; vscode-languageclient 10.1.0 push/pull middleware mechanics read from source (Gate 1) |
| SEC-06 | USE-statement resolution rejects paths outside PREFIX roots | `addImportedBBjDocuments` and `getBBjClassesFromFile` read verbatim; D-13 filesystem scan complete, zero breaking paths found |
| SEC-07 | `isExternalDocument()` compares on segment boundaries | Exact current `startsWith` code read (bbj-ws-manager.ts:273-283); no existing direct unit test found — Wave 0 gap |
| SEC-08 | `isTokenizedFile`/`statSize` reject symlinks/non-regular files | Exact current code read (decompile-io.ts:16-41); Node `O_NOFOLLOW`/`O_NONBLOCK` platform availability confirmed |
| SEC-09 | Formatter's `java` binary configurable and verified before spawn | Exact current `cp.spawn('java', formatFlags)` read; sibling precedent `bbj-home-layout.ts`'s `isExecutableFile`/`resolveBbjBinary` found and read in full — directly reusable pattern |
| REF-02 | Interop defaults defined once, used by both entry points | Both entry points' current duplicated-default code read and quoted (Gate 7) |
</phase_requirements>

## Standard Stack

No new external dependencies. Every module this phase adds is plain TypeScript using only
Node built-ins already used elsewhere in the repo (`fs`, `path`, `os`, `child_process` is NOT
needed — `document-formatter.ts` already imports `cp`). `config-path-resolver.ts` and
`bbj-home-layout.ts` are the two existing in-repo templates to follow.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none — Node built-ins only) | Node >=22 (`package.json` `engines.node`) | `fs`, `path`, `os` for path containment, symlink/FIFO checks, PATH walking | Matches every existing plain module in this repo (`config-path-resolver.ts`, `bbj-home-layout.ts`) |

### Supporting
None.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled PATH walker (D-20) | `which`/`shelljs` npm packages | Repo has zero precedent for a `which`-style dependency; the walk is ~15 lines and needs injectable fs/env probes per D-20 anyway, which a third-party `which` package would not provide without wrapping |

**Installation:** None — no `npm install` needed for this phase.

**Version verification:** N/A (no new packages). Confirmed installed `vscode-languageclient` version directly from `bbj-vscode/node_modules/vscode-languageclient/package.json`: **10.1.0**, matching `package.json`'s `^10.1.0` declaration. `@types/vscode` matches `engines.vscode: ^1.101.0`.

## Package Legitimacy Audit

Not applicable — this phase installs no new packages. All new modules use `node:fs`, `node:path`,
`node:os` only, mirroring `config-path-resolver.ts`'s explicit "Kept free of Langium and editor
imports" convention.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────────┐
                    │  VS Code Client (extension.ts)                  │
                    │                                                  │
  workspace          │  ┌────────────────────┐                         │
  settings.json ────▶│  │ getEffectiveConfigPath()  (D-06 helper)      │
  (may be untrusted) │  │  - isTrusted? get() : inspect().globalValue  │
                    │  └──────────┬─────────┘                         │
                    │             │                                    │
                    │   ┌─────────┴──────────┐                        │
                    │   │ initializationOptions│   synchronize.        │
                    │   │  configPath: helper() │  configurationSection│
                    │   │  interopHost/Port:    │  'bbj' push          │
                    │   │  raw get() (unvalidated)│ (middleware hook,  │
                    │   └─────────┬──────────┘   │  Gate 1 finding)    │
                    └─────────────┼───────────────┼────────────────────┘
                                  │  LSP initialize / didChangeConfiguration
                                  ▼
                    ┌─────────────────────────────────────────────────┐
                    │  Language Server (main.ts / bbj-ws-manager.ts)  │
                    │                                                  │
                    │  onInitialize / onDidChangeConfiguration         │
                    │       │                                          │
                    │       ▼                                          │
                    │  validateInteropConfig(host, port)  (D-01)       │──▶ JavaInteropService
                    │       │  (shared defaults + fallback + warn)     │    .setConnectionConfig()
                    │       ▼                                          │
                    │  wsManager.setConfigPath(config.configPath)      │
                    │       (already gated by client; D-05: no server- │
                    │        side containment on configPath itself)    │
                    └─────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────────┐
                    │  BBjDocumentBuilder.addImportedBBjDocuments      │
                    │  for each USE import path, for each prefix root:│
                    │    candidate = resolve(prefixRoot, importPath)   │
                    │    isPathInside(prefixRoot, candidate)? (D-10)   │──▶ fsProvider.readFile()
                    │        NO  → skip, try next prefix               │    (only if contained)
                    │        YES → readFile, break                     │
                    └─────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────────┐
                    │  decompile-io.ts (extension host, via Commands  │
                    │  .cjs / bbjlst decompile flow)                   │
                    │    lstat(path) → isFile()?                       │
                    │      NO  → not-a-file (statSize: undefined,      │
                    │             isTokenizedFile: false)               │
                    │      YES → open(O_NOFOLLOW|O_NONBLOCK) → fstat   │
                    │             re-check isFile() → read magic bytes │
                    └─────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────────┐
                    │  document-formatter.ts (VS Code client only)     │
                    │    bbj.formatter.javaPath (scope: machine)        │
                    │      set   → resolve+verify (D-19) → spawn or err │
                    │      empty → walk PATH (D-20) → verify → spawn    │
                    │                                         or err    │
                    │    (SHA-256 JAR verification: unchanged, runs      │
                    │     first, same as today)                          │
                    └─────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
bbj-vscode/src/language/
├── interop-config.ts          # NEW — D-01/D-02/D-03/D-04/REF-02: defaults + validator
├── path-containment.ts        # NEW — D-10: isPathInside(root, candidate)
├── bbj-ws-manager.ts          # MODIFIED — D-01 call site, D-15 isExternalDocument
├── bbj-document-builder.ts    # MODIFIED — D-11 containment check before readFile
├── bbj-scope.ts               # MODIFIED — D-12 containment check on prefix candidates
├── main.ts                    # MODIFIED — D-01 call site (2nd entry point)
bbj-vscode/src/
├── decompile-io.ts            # MODIFIED — D-16/D-17
├── document-formatter.ts      # MODIFIED — D-19/D-20 call sites
├── formatter-java-resolver.ts # NEW (suggested name) — D-19/D-20 plain resolver+checker
├── extension.ts               # MODIFIED — D-06 helper call sites (or import from sibling)
├── config-path-trust.ts       # NEW (suggested name, Claude's Discretion) — D-06 helper
```

### Pattern 1: Injectable plain module (established in this repo)
**What:** A Langium/editor-import-free module exporting pure functions, with an optional
`deps` parameter carrying fs/env probes that default to real implementations — used by
`config-path-resolver.ts` (`ConfigPathProbeDeps`) and `bbj-home-layout.ts` (`platform` param).
**When to use:** Every new module this phase adds (D-01 validator, D-10 path helper, D-19/D-20
resolver).
**Example (from `config-path-resolver.ts`, read this session):**
```typescript
// Source: bbj-vscode/src/language/config-path-resolver.ts (verified, read in full)
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

### Pattern 2: Existing "resolve + check executable" precedent to reuse for D-19
**What:** `bbj-home-layout.ts` already has the exact check D-19 asks for.
**When to use:** D-19/D-20's javaPath verification. Either import a newly-exported
`isExecutableFile` or duplicate its ~10-line body (it is currently unexported).
**Example (verified, read in full this session — `bbj-vscode/src/bbj-home-layout.ts:54-64`):**
```typescript
// Source: bbj-vscode/src/bbj-home-layout.ts:54-64 (verified, read this session)
function isExecutableFile(p: string): boolean {
    try {
        if (!fs.statSync(p).isFile()) {   // follows symlinks — matches D-19's "after following symlinks"
            return false;
        }
        fs.accessSync(p, fs.constants.X_OK);   // on Windows, X_OK degrades to an existence check — matches D-19's Windows carve-out for free
        return true;
    } catch {
        return false;
    }
}
```
This already satisfies D-19's exact requirement ("absolute, exists, is a regular file after
following symlinks, and executable via `fs.accessSync(X_OK)`; on Windows existence only") with
zero platform branching needed — Windows' `X_OK` semantics naturally reduce to existence.

### Pattern 3: `samePath`'s Windows-safe comparison as a precedent for D-10's case-insensitivity
**What:** `config-path-resolver.ts`'s `samePath()` already implements "case-insensitive on
win32/darwin, exact elsewhere" for path comparison — the exact platform split D-10 asks for.
**Example (verified, read this session):**
```typescript
// Source: bbj-vscode/src/language/config-path-resolver.ts (verified, read this session)
export function samePath(a: string, b: string): boolean {
    const na = a.normalize('NFC');
    const nb = b.normalize('NFC');
    if (process.platform === 'win32' || process.platform === 'darwin') {
        return na.toLowerCase() === nb.toLowerCase();
    }
    return na === nb;
}
```
D-10's `isPathInside` can follow the same `process.platform` branch structure (Windows-only
per the decision text, not darwin — confirm this narrower scope with the planner since D-10 says
"On Windows" only, not "win32 or darwin" like `samePath`).

### Pattern 4: `addImportedBBjDocuments`'s current prefix-resolution loop (exact insertion point for D-11)
**Example (verified, read this session — `bbj-vscode/src/language/bbj-document-builder.ts:1114-1129`):**
```typescript
// Source: bbj-vscode/src/language/bbj-document-builder.ts:1114-1129 (verified, read this session)
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
D-11's fix inserts `if (!isPathInside(prefixPath, prefixedPath.fsPath)) continue;` immediately
after computing `prefixedPath`, before the `try`/`readFile` call — so the containment failure is
indistinguishable from "not found at this prefix" and falls through to the next prefix exactly
as D-11 specifies.

### Pattern 5: `getBBjClassesFromFile`'s three-candidate concat (exact insertion point for D-12)
**Example (verified, read this session — `bbj-vscode/src/language/bbj-scope.ts:330-339`):**
```typescript
// Source: bbj-vscode/src/language/bbj-scope.ts:330-339 (verified, read this session)
private getBBjClassesFromFile(container: AstNode, bbjFilePath: string, simpleName: boolean) {
    const currentDocUri = AstUtils.getDocument(container).uri;
    const prefixes = this.workspaceManager.getSettings()?.prefixes ?? [];
    const workspaceRoots = this.workspaceManager.getWorkspaceFolderUris();
    const adjustedFileUris = [UriUtils.resolvePath(UriUtils.dirname(currentDocUri), bbjFilePath)]
        // document-relative candidate — D-12: UNCHANGED, exempt from containment
        .concat(workspaceRoots.map(root => UriUtils.resolvePath(root, bbjFilePath)))
        // workspace-root candidate (#378) — D-12: UNCHANGED, exempt from containment
        .concat(prefixes.map(prefixPath => URI.file(resolve(prefixPath, bbjFilePath))));
        // prefix candidate — D-12: gets isPathInside(prefixPath, ...) filter
    let bbjClasses = stream((this.indexManager as BBjIndexManager).getBBjClassesForFiles(adjustedFileUris));
    // ...
}
```
Only the third `.concat(...)` (prefix-derived) needs filtering; `.filter()` before the final
`.concat` or a `.map(...).filter(Boolean)` both work since these candidates only feed an index
lookup (`getBBjClassesForFiles`), never a file read — an excluded candidate can simply be dropped
from the array rather than requiring a two-step map/filter with tracked provenance.

### Anti-Patterns to Avoid
- **A second hand-rolled `startsWith` containment check:** D-10 explicitly forbids this — the
  existing `bbj-ws-manager.ts:277` `fsPath.startsWith(URI.file(prefix).fsPath)` is the ONE
  instance in the entire codebase (confirmed via full-repo grep) and D-15 replaces it with
  `isPathInside`; no new call site should reinvent it.
- **Resolving symlinks for USE-path containment:** D-13 is explicit that containment is lexical
  only — do not call `fs.realpathSync` on the USE-path candidate before checking containment
  (that would be a behavior change beyond what SEC-06 asks for, and would require an async
  filesystem call in a currently-sync-feeling loop).
- **Passing `next(sections)` through unmodified when a value needs to change:** confirmed from
  `vscode-languageclient`'s source (Gate 1) that `didChangeConfiguration`'s `next` re-derives
  values from `vscode.workspace.getConfiguration()` itself — calling it after mutating `sections`
  does NOT let the middleware substitute a value.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Is candidate path inside root, on segment boundaries, cross-platform" | A new `startsWith`-based check, or a regex | `path.relative()`-based `isPathInside` (D-10); `path.relative(root, candidate)` starts with `..` or is absolute iff outside | `path.relative` already normalizes `.`/`..`/mixed separators; a `startsWith` string check (the exact bug SEC-07 fixes) is the textbook failure mode this problem produces |
| "Is this path a regular file, safely, without following a symlink into something that blocks" | A hand-rolled stat+read sequence | `fs.promises.lstat` → check `isFile()` → `fs.promises.open(path, flags)` with `O_NOFOLLOW \| O_NONBLOCK` where defined → `fstat()` re-check | TOCTOU-safe pattern (D-17); Node's own `fs.constants` already expose the right flags on POSIX, no third-party lib needed |
| "Verify an executable path before spawning it" | New ad-hoc `fs.existsSync` + `fs.accessSync` inline in `document-formatter.ts` | `bbj-home-layout.ts`'s existing `isExecutableFile` pattern | Already implemented, already tested via `bbj-home-layout.test.ts`'s fixtures, and already handles the Windows `X_OK`-degrades-to-existence nuance D-19 calls out |
| "Walk PATH to find an executable" | A `which`/`shelljs` dependency | ~15-line plain function splitting `process.env.PATH` on `path.delimiter`, applying `PATHEXT` on `win32` | No existing dependency for this in the repo; D-20 requires injectable fs/env probes anyway, which wrapping a third-party lib would not simplify |

**Key insight:** This phase's don't-hand-roll risk is not "reach for an npm package" (there are
none to reach for) — it's "reinvent a check this repository has already built and tested once."
`bbj-home-layout.ts` and `config-path-resolver.ts` are the two existing precedents; every new
module in this phase should visibly follow one of them.

## Common Pitfalls

### Pitfall 1: Treating the `synchronize.configurationSection` push as inert/pull-only
**What goes wrong:** The `SynchronizeOptions.configurationSection` TSDoc in vscode-languageclient
says pushing settings "is deprecated in favour of the new pull model" and implies the client "can
only deliver an empty change event" — reading only that comment, a planner could conclude the
D-06 gate doesn't need to cover the push path at all.
**Why it happens:** The TSDoc is accurate only for the *no-section* case (`{settings: null}`).
Because `bbj-vscode` DOES configure `configurationSection: 'bbj'`, `SyncConfigurationFeature`
calls `extractSettingsInformation(['bbj'])`, which calls `vscode.workspace.getConfiguration('bbj').get(...)`
directly and sends the real values — confirmed by reading `configuration.js` in
`node_modules/vscode-languageclient@10.1.0` this session.
**How to avoid:** Gate both paths as D-06 already specifies. For the push path specifically,
either (a) implement `middleware.workspace.didChangeConfiguration` and, only when the change
affects `bbj.configPath` in an untrusted workspace with a different effective value, bypass
`next()` and call the captured `LanguageClient` instance's own `sendNotification(DidChangeConfigurationNotification.type, {settings})`
with a corrected payload built the same shape `extractSettingsInformation` uses; or (b) route
configPath exclusively through `initializationOptions` + the existing custom `CONFIG_RELOAD_METHOD`/
resolved-config-path notification pair (already used for hot-reload today) and treat the
generic push's `config.configPath` value in `main.ts`'s handler as advisory only, re-validating
it server-side is out of scope per D-05/D-09 (server has no trust concept) — but note `main.ts`
line 269 (`wsManager.setConfigPath(config.configPath || '')`) currently trusts whatever arrives
unconditionally, so if the push is left ungated, an untrusted workspace's value would still land
server-side via that path. **This needs an explicit planner decision; flagged as Open Question 1.**
**Warning signs:** A unit test that only stubs `initializationOptions` and never exercises
`vscode.workspace.onDidChangeConfiguration`/the push path would pass while criterion 2 is
actually unmet for the second path.

### Pitfall 2: Assuming `restrictedConfigurations` needs no extension code
**What goes wrong:** VS Code's own docs say a setting listed in `restrictedConfigurations`
"doesn't need any additional code changes" — a planner reading only that line could conclude
D-06's client helper is unnecessary once the manifest entry is added.
**Why it happens:** That guarantee only applies once the extension actually activates and runs
in Restricted Mode, which requires `capabilities.untrustedWorkspaces` to be `true` or `limited`.
`bbj-vscode` has neither today (confirmed: no `capabilities` key in `package.json` at all), so
the extension is fully disabled in an untrusted workspace and `restrictedConfigurations` would
never take effect. D-08 already anticipates this — do not add the manifest declaration this
phase; ship the D-06 helper as the actual (client-code) gate.
**How to avoid:** Follow D-08 literally: no `capabilities` block change, helper ships regardless,
tests use a stubbed `vscode.workspace.isTrusted`/`inspect()`, not a live Restricted Mode session.
**Warning signs:** A plan task that edits `package.json`'s `contributes` or adds a top-level
`capabilities` key.

### Pitfall 3: Forgetting `isExternalDocument()` has zero existing direct test coverage
**What goes wrong:** Five call sites (`bbj-index-manager.ts`, `bbj-linker.ts`,
`bbj-scope-local.ts`, `bbj-document-builder.ts` ×2) depend on `isExternalDocument()`, but no test
file targets the method directly — a plan that only asserts through one of those five indirect
consumers risks a shallow/flaky regression signal for D-15's actual fix.
**How to avoid:** Add a direct unit test for `isExternalDocument()` (Wave 0 gap, see Validation
Architecture) exercising the literal `/libs/foo2/` vs `/libs/foo` example from CONTEXT.md's
Specific Ideas section.
**Warning signs:** Plan tasks that only modify/assert through `linking.test.ts` or
`document-builder.test.ts` without a dedicated `isExternalDocument`-focused test.

### Pitfall 4: The `no-shell-command-construction.test.ts` comment about `document-formatter.ts` becomes stale
**What goes wrong:** `bbj-vscode/test/no-shell-command-construction.test.ts` (read this session)
pins the exact set of `child_process`-importing files under `src/` and its own comment says
`document-formatter.ts` is on that pinned list "because it runs `java` from PATH, not a path
derived from a configured setting." After SEC-09 ships, that statement becomes factually wrong
(`java` CAN now come from a configured setting, `bbj.formatter.javaPath`).
**Why it happens:** The test's assertion (`toEqual(['Commands/process-runner.ts',
'document-formatter.ts', 'language/bbj-cpl-service.ts'])`) will still pass unmodified — the file
list doesn't change, only the *reason* the comment gives is now wrong — so nothing forces this to
be caught by CI.
**How to avoid:** Add a plan task to update that comment alongside the D-19/D-20 implementation.
**Warning signs:** Code review flags a stale comment; or nobody notices and a future reader is
misled about the trust boundary `document-formatter.ts` sits inside.

### Pitfall 5: `O_NOFOLLOW`/`O_NONBLOCK` silently becoming `0` on win32
**What goes wrong:** `fs.constants.O_NOFOLLOW`/`O_NONBLOCK` are `undefined` on win32 (confirmed:
these are POSIX-only constants, absent from Node's Windows `fs.constants` binding). If D-17's
implementation does `fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK | fs.constants.O_RDONLY`
unconditionally, `undefined | x` coerces `undefined` to `0` via JS's bitwise-OR ToInt32
conversion — the flags silently vanish rather than throwing, so a naive implementation
*looks* like it works on Windows (no runtime error) while providing none of the symlink/blocking
protection.
**How to avoid:** D-17 already specifies the platform branch explicitly ("On Windows, where they
are undefined, it opens plainly after the `lstat` check") — implement that branch check
(`typeof fs.constants.O_NOFOLLOW === 'number'`) rather than relying on the bitwise-OR to no-op
correctly by coincidence.
**Warning signs:** A test suite that only runs on Linux (this dev container's platform) would
never catch a Windows-only regression here — this is exactly why D-17 calls for an explicit
platform branch, not implicit coercion.

## Runtime State Inventory

Not applicable — this is not a rename/refactor/migration phase. No stored data, live service
config, OS-registered state, secrets, or build artifacts carry any of the renamed/touched
identifiers (`interopHost`, `configPath`, prefix paths, `javaPath` is a brand-new setting name
with no prior existence anywhere).

## Code Examples

### D-01: Exact current code both entry points must stop doing

```typescript
// Source: bbj-vscode/src/language/bbj-ws-manager.ts:72-74 (verified, read this session)
const interopHost = params.initializationOptions.interopHost || 'localhost';
const interopPort = params.initializationOptions.interopPort || 5008;
this.javaInterop.setConnectionConfig(interopHost, interopPort);
```

```typescript
// Source: bbj-vscode/src/language/main.ts:263-264,275 (verified, read this session)
const newInteropHost = config.interop?.host || 'localhost';
const newInteropPort = config.interop?.port || 5008;
// ...
javaInterop.setConnectionConfig(newInteropHost, newInteropPort);
```

```typescript
// Source: bbj-vscode/src/language/java-interop.ts:489-493 (verified, read this session)
public setConnectionConfig(host: string, port: number): void {
    this.interopHost = host || '127.0.0.1';
    this.interopPort = port || 5008;
    logger.debug(`Java interop connection config: ${this.interopHost}:${this.interopPort}`);
}
```
Note the three-way default disagreement REF-02 exists to collapse: `'localhost'` (×2) vs
`'127.0.0.1'` (×1) — D-02 resolves this to `'localhost'` everywhere.

### D-06: Exact current client hand-off code that needs the trust helper

```typescript
// Source: bbj-vscode/src/extension.ts:1097-1104 (verified, read this session)
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
// Source: bbj-vscode/src/extension.ts:1092-1096 (verified, read this session)
synchronize: {
    fileEvents: fileSystemWatcher,
    configurationSection: 'bbj'   // <- Gate 1: second live path, needs the D-06 helper via middleware or an equivalent
},
```

### D-06 Gate 1 finding: vscode-languageclient 10.1.0's push mechanism (full detail)

```typescript
// Source: bbj-vscode/node_modules/vscode-languageclient/lib/common/configuration.js (verified, read this session)
// SyncConfigurationFeature.onDidChangeConfiguration:
const didChangeConfiguration = async (sections) => {
    if (sections === undefined) {
        return this._client.sendNotification(DidChangeConfigurationNotification.type, { settings: null });
    } else {
        // THIS branch runs for bbj-vscode, since configurationSection: 'bbj' is set:
        return this._client.sendNotification(DidChangeConfigurationNotification.type, {
            settings: this.extractSettingsInformation(sections)   // <- real vscode.workspace.getConfiguration() values, nested under 'bbj'
        });
    }
};
const middleware = this._client.middleware.workspace?.didChangeConfiguration;
(middleware ? middleware(sections, didChangeConfiguration) : didChangeConfiguration(sections))
    .catch(/* ... */);
```
```typescript
// extractSettingsInformation reads live config per key, ignoring any client-side override:
config = vscode_1.workspace.getConfiguration(key.substr(0, index), resource).get(key.substr(index + 1));
```
The `middleware.workspace.didChangeConfiguration` type signature (verified from
`configuration.d.ts`):
```typescript
export interface DidChangeConfigurationSignature {
    (this: void, sections: string[] | undefined): Promise<void>;
}
export interface DidChangeConfigurationMiddleware {
    didChangeConfiguration?: (this: void, sections: string[] | undefined, next: DidChangeConfigurationSignature) => Promise<void>;
}
```
`next` only accepts `sections` (which keys to re-read), not a value override — confirming the
middleware cannot rewrite a single field's value by calling `next()`. The only clean value-level
substitution point in this library is the **pull-model** `middleware.workspace.configuration`
hook (`ConfigurationRequest.MiddlewareSignature`), used when the server calls
`connection.workspace.getConfiguration('bbj')` — which `main.ts`'s handler already falls back to
when `change.settings?.bbj` is absent (it normally isn't, since the push always populates it).

### D-08 finding: VS Code's own extension-guide docs on default Restricted Mode behavior

> "An extension that does not contribute anything to their `package.json` will be treated as
> not supporting Workspace Trust. It will be disabled when a workspace is in Restricted Mode."
> — [VS Code Workspace Trust Extension Guide](https://code.visualstudio.com/api/extension-guides/workspace-trust) [CITED]

> "the extension will not be given workspace-defined values when in Restricted Mode for an
> untrusted workspace... Your extension then doesn't need to make any additional code changes to
> handle the setting." — same source, on `restrictedConfigurations` [CITED]

> "When trust is granted, a configuration change event will fire in addition to the Workspace
> Trust event." — same source [CITED] — confirms D-07's assumption that
> `onDidChangeConfiguration` fires on the trust-granted transition even for a previously-hidden
> workspace value.

Confirmed present in this repo's installed `@types/vscode` (matching `engines.vscode: ^1.101.0`):
```
bbj-vscode/node_modules/@types/vscode/index.d.ts:8005:  readonly isTrusted: boolean;
bbj-vscode/node_modules/@types/vscode/index.d.ts:14466: export const isTrusted: boolean;
bbj-vscode/node_modules/@types/vscode/index.d.ts:14471: export const onDidGrantWorkspaceTrust: Event<void>;
```
[VERIFIED: bbj-vscode/node_modules/@types/vscode/index.d.ts:8005,14466,14471]

Confirmed absence of any `capabilities` key in `bbj-vscode/package.json` [VERIFIED:
bbj-vscode/package.json — `grep -n "capabilities"` returned zero matches this session].

### D-13: filesystem scan results (Gate 2)

Commands run this session (see Verification section for exact commands). Result: **zero** USE
statements anywhere in `examples/` or `bbj-vscode/test/` (`.bbj`/`.bbjt`/`.src`/`.bbl` files, and
`.ts` test fixtures with inline BBj source) contain a `..` path segment. The only absolute-path
USE statements found are in `bbj-vscode/test/classes.test.ts` (lines 77, 92):
```typescript
// Source: bbj-vscode/test/classes.test.ts:76-79 (verified, read this session)
const { diagnostics } = await validate(`
    use ::${document.uri.fsPath}::A

    let a! = new A()
`);
```
This substitutes an in-memory test document's absolute `fsPath` — but no `prefixes` are
configured in this test file (confirmed by reading `classes.test.ts` in full; no `settings =
{ prefixes: ... }` assignment appears), so this exercises only the **document-relative** first
candidate in `getBBjClassesFromFile` (`UriUtils.resolvePath(UriUtils.dirname(currentDocUri),
bbjFilePath)`, which for an absolute `bbjFilePath` simply resolves to that absolute path
regardless of the dirname base) — exactly the candidate D-12 exempts. **No plan task is needed
to fix or update these tests; they remain green under D-11/D-12/D-15 unmodified.**

### D-14/D-15 test model: two directly-reusable existing patterns

```typescript
// Source: bbj-vscode/test/lazy-prefix-loading.test.ts (verified, read in full this session)
// The exact "spy FileSystemProvider + injected prefixes + parseHelper" shape D-14 asks for:
class InMemoryFileSystemProvider implements FileSystemProvider {
    async readFile(uri: URI): Promise<string> { return this.readFileSync(uri); }
    readFileSync(uri: URI): string {
        const content = files.get(uri.fsPath);
        if (content === undefined) throw new Error(`ENOENT: ${uri.fsPath}`);
        return content;
    }
    // ... stat/exists/readDirectory
}
const services = createBBjServices({ fileSystemProvider: () => new InMemoryFileSystemProvider() });
// ...
const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
(wsManager as unknown as { settings: { prefixes: string[]; classpath: string[] } }).settings =
    { prefixes: [LIB_DIR], classpath: [] };
// ...
const parse = parseHelper<Model>(services.BBj);
await parse(`use ::Used.bbj::UsedClass\nx! = new UsedClass()`, {
    documentUri: 'file:///virtual/project/main.bbj',
    validation: false,
});
```
For D-14, wrap `readFile`/`readFileSync` in `vi.fn(...)` (or a manually-tracked call array) so
the test can assert `readFile` was never called with a URI outside the prefix root, per
CONTEXT.md's Specific Ideas: "assert on the spy's recorded `readFile` targets, not only on the
resulting documents."

### D-16/D-17: exact current decompile-io.ts code being hardened

```typescript
// Source: bbj-vscode/src/decompile-io.ts:16-41 (verified, read this session)
export async function isTokenizedFile(file: string): Promise<boolean> {
    let handle: fs.promises.FileHandle | undefined;
    try {
        handle = await fs.promises.open(file, 'r');   // <- D-17: needs lstat-first + O_NOFOLLOW|O_NONBLOCK
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
        const stat = await fs.promises.stat(file);   // <- D-16: needs to become fs.promises.lstat + isFile() check
        return { size: stat.size };
    } catch {
        return undefined;
    }
}
```
Existing test file `bbj-vscode/test/decompile-io.test.ts` already establishes the
`fs.mkdtempSync(path.join(os.tmpdir(), 'decompile-io-test-'))` + `beforeEach`/`afterEach` pattern
to extend for symlink/directory/FIFO fixtures.

### D-19/D-20: current spawn call and existing analogous "resolve+verify before spawn" precedent

```typescript
// Source: bbj-vscode/src/document-formatter.ts:144 (verified, read this session)
const p = cp.spawn('java', formatFlags);   // <- D-19/D-20 replaces 'java' with the resolved/verified path
```

```typescript
// Source: bbj-vscode/src/bbj-home-layout.ts:89-122 (verified, read this session — full function)
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
    // ... marker checks via isExecutableFile ...
    const requested = path.join(bbjHome, 'bin', suffixed(binary, platform));
    if (!isExecutableFile(requested)) {
        return { reason: REASON_REQUESTED_NOT_EXECUTABLE };
    }
    return { path: requested };
}
```
`{ path?: string; reason?: string }` (exactly one set) is this repo's established result shape
for "resolve or explain why not" — reuse it for the new `formatter-java-resolver.ts`'s return
type, matching D-19's "shows an error message naming the path and the reason."

### Test-guard comment that will need updating (Pitfall 4)
```typescript
// Source: bbj-vscode/test/no-shell-command-construction.test.ts:82-92 (verified, read this session)
/**
 * Pins which modules under src/ may launch a process at all: a fourth importer
 * of child_process is a new execution site to review, not test data to widen
 * the expected set for. document-formatter.ts is on the list because it runs
 * `java` from PATH, not a path derived from a configured setting.     // <- becomes stale after SEC-09
 */
describe('no-shell-command-construction guard — which modules may launch a process', () => {
    test('the set of files under src/ importing child_process is exactly the three known launchers', () => {
        const importers = filesImportingChildProcess(SRC_DIR);
        expect(importers).toEqual(['Commands/process-runner.ts', 'document-formatter.ts', 'language/bbj-cpl-service.ts']);
    });
```
The assertion itself (the file list) does not need to change — only the comment's rationale.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `configurationSection` push-model settings sync | `workspace/configuration` pull model | Deprecated in vscode-languageclient's own TSDoc (no specific version cited by the doc comment) | `bbj-vscode` still uses the push model (`configurationSection: 'bbj'`); this phase must work within that existing choice, not migrate to pull (migrating is out of scope and a much larger change) |

**Deprecated/outdated:** None specific to this phase beyond the note above — this is a stability
codebase (v4.7 "audit hygiene"), not a chase of upstream API churn.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `O_NOFOLLOW`/`O_NONBLOCK` are `undefined` on Node's win32 `fs.constants` binding, and bitwise-OR with `undefined` silently coerces to `0` rather than throwing | Pitfall 5, Code Examples (D-17) | If wrong (e.g. Node has since polyfilled these on Windows), the explicit `typeof === 'number'` branch D-17 already specifies is still safe either way — this is a defense-in-depth claim, not a hard blocker. Confirmed via a GitHub issue discussion, not the primary Node.js `fs.constants` docs page directly (WebFetch on the docs page did not return the specific platform-availability text) |
| A2 | The IntelliJ `javaInteropHost`/`javaInteropPort` key-name mismatch (Gate 6 finding) is a genuine pre-existing bug, not an intentional two-name convention with a translation layer elsewhere | Open Questions | If wrong, the planner might waste a task "fixing" something that already has a translation step this research missed; a targeted `grep -rn "javaInteropHost\|javaInteropPort" bbj-vscode/src` returned zero matches, which is strong evidence, but the researcher did not exhaustively trace every IntelliJ-side settings write path |

## Open Questions

1. **How exactly should the `synchronize.configurationSection: 'bbj'` push be gated for
   `bbj.configPath` in an untrusted workspace, given `middleware.workspace.didChangeConfiguration`
   cannot substitute a single field's value via `next()`?**
   - What we know: The push sends real values (Gate 1, verified from library source); the pull
     model's `middleware.workspace.configuration` hook CAN cleanly substitute a returned value;
     `main.ts`'s handler (`config.configPath || ''` at line 269) currently trusts whatever
     `change.settings.bbj.configPath` arrives, unconditionally.
   - What's unclear: Whether the plan should (a) implement a bypass-`next()` middleware that
     manually re-sends a corrected `didChangeConfiguration` notification, or (b) treat the
     generic push's `configPath` field as untrusted server-side too — but D-09 says the server
     has no trust concept, so (b) would need the client to simply never let the raw value differ
     from the gated one, which circles back to (a) or to a third option: strip `configPath` from
     what the generic sync ever sends and rely solely on the custom `initializationOptions` +
     existing `CONFIG_RELOAD_METHOD`/resolved-config-path notification pair the extension already
     has for hot-reload.
   - Recommendation: Plan this as its own explicit task with the three options above spelled out;
     given `main.ts`'s hot-reload path already re-resolves and re-notifies on any `configPath`
     change (lines 266-272), the cleanest fix may be option (c) — since the extension already has
     a purpose-built, gated notification channel for config-path changes, consider whether the
     generic `bbj` section push needs to carry `configPath` at all, versus letting the pull-model
     `middleware.workspace.configuration` (used by `connection.workspace.getConfiguration('bbj')`)
     be the single substitution point for both the pull fallback AND the rare case sections list
     changes. This decision affects effort estimation for the Workspace Trust plan (wave/plan 4
     per CONTEXT.md's suggested grouping) and should be confirmed with the user or made explicit
     in the plan rather than resolved silently by the executor.

2. **The IntelliJ `javaInteropHost`/`javaInteropPort` key mismatch (Gate 6 finding): fix or
   leave alone?**
   - What we know: `BbjLanguageServerFactory.java` sends `javaInteropHost`/`javaInteropPort` in
     `initializationOptions`; the language server (`bbj-ws-manager.ts:72-73`) only ever reads
     `interopHost`/`interopPort`. A repo-wide grep for `javaInteropHost`/`javaInteropPort` in
     `bbj-vscode/src` returns zero matches — the values are never read under any name match.
   - What's unclear: Whether this is a known, already-tracked bug (not found in REQUIREMENTS.md,
     ROADMAP.md, or DEBT.md's current entries via this session's reading) or genuinely novel.
   - Recommendation: Do NOT fix it in this phase — it is not named in SEC-01/REF-02's issue list
     (#509/#510/#581) and fixing it would be a functional/behavioral change beyond "validate
     what already arrives," which risks scope creep into a phase whose goal is specifically
     narrow. Flag it for the user to file as a follow-up (todo or new issue) after this phase.

## Environment Availability

Not applicable — this phase has no new external tool/service dependencies. All new code paths
use Node built-ins (`fs`, `path`, `os`) already available in the `node >=22` engine this project
requires. No new socket, database, or CLI dependency is introduced. (The interop socket at
:5008 already exists and is unaffected — SEC-01 only validates the *values* used to reach it.)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (confirmed via `npx vitest --version` this session) |
| Config file | `bbj-vscode/vitest.config.ts` |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <file>` |
| Full suite command | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode test` |

All commands must run with cwd = `bbj-vscode` (or via `npm --prefix`) per this project's
`vitest-cwd-relative-fixtures` constraint — several fixture-relative suites `ENOENT` otherwise.
Never pass `--reporter=basic` (unsupported in vitest 4.1.10). Never invoke `DocumentBuilder.build`
in a test — it reaches the real :5008 socket; use `parseHelper` (see D-14 pattern above) instead.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 / REF-02 | Invalid host/port falls back to shared default + warns, per-field, through both entry paths | unit | `npx vitest run test/interop-config.test.ts` (new) | ❌ Wave 0 |
| SEC-01 / REF-02 | `setConnectionConfig` itself validates (cannot be bypassed) | unit | `npx vitest run test/java-interop-service.test.ts` (extend existing) | ✅ exists, extend |
| SEC-02 | Untrusted workspace → `inspect().globalValue`/default used for `configPath` in `initializationOptions` | unit | `npx vitest run test/extension-config-trust.test.ts` (new) or extend `test/extension-activation.test.ts` | ❌ Wave 0 |
| SEC-02 | Push-path (`configurationSection`) gate — see Open Question 1 | unit | same new file, once the approach is decided | ❌ Wave 0 |
| SEC-02 | Trust granted → re-push, server re-resolves | unit/integration | extend `test/config-reload-host.test.ts` or `test/config-path-resolution.test.ts` | ✅ exists, extend |
| SEC-06 | `addImportedBBjDocuments` never reads outside prefix roots (`..` and absolute-outside cases) | unit | `npx vitest run test/document-builder.test.ts` (extend) or new `test/use-path-containment.test.ts` | ✅/❌ extend or new |
| SEC-06 | `getBBjClassesFromFile` prefix candidates filtered, document-relative/workspace-root unaffected | unit | `npx vitest run test/classes.test.ts` (extend) | ✅ exists, extend |
| SEC-07 | `isExternalDocument()` — `/libs/foo2/` not inside `/libs/foo`; trailing-separator and exact-prefix cases | unit | `npx vitest run test/ws-manager.test.ts` (extend) or new `test/is-external-document.test.ts` | ❌ Wave 0 (no direct test exists today — Pitfall 3) |
| SEC-08 | `statSize`/`isTokenizedFile` reject symlink, directory, FIFO | unit | `npx vitest run test/decompile-io.test.ts` (extend) | ✅ exists, extend |
| SEC-09 | `javaPath` set + invalid → error, no spawn; set + valid → spawns exact path; empty → PATH-walk + verify + spawn or error | unit | `npx vitest run test/document-formatter.test.ts` (extend) + new `test/formatter-java-resolver.test.ts` | ✅/❌ extend + new |
| SEC-09 | `no-shell-command-construction.test.ts` comment accuracy | source guard (manual review, not a new automated assertion) | n/a | ✅ exists — update comment only |

### Sampling Rate
- **Per task commit:** targeted file run, e.g. `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/interop-config.test.ts`
- **Per wave merge:** `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode test` (full suite, judged on `numFailedTests: 0` per the project's standing whole-suite-gate decision, not failing-suite identity — `initializeWorkspace()` `beforeAll` hook timeouts under whole-suite load are known contention noise, not new failures; use `--maxWorkers=2` if hook timeouts appear)
- **Phase gate:** Full suite green (by the `numFailedTests: 0` standard) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `test/interop-config.test.ts` (or similar name) — new file for D-01's shared validator, covering SEC-01/REF-02
- [ ] A direct `isExternalDocument()` test (new file or a new `describe` block in `ws-manager.test.ts`) — covers SEC-07, closes the Pitfall 3 gap
- [ ] `test/formatter-java-resolver.test.ts` (or similar) — new file for D-19/D-20's plain resolver
- [ ] A trust-focused extension test (new file or extension of `test/extension-activation.test.ts`) for D-06/D-08 — must stub `vscode.workspace.isTrusted`, `inspect()`, `onDidGrantWorkspaceTrust`; no framework install needed (vi.mock('vscode', ...) pattern already established in `test/document-formatter.test.ts`)

## Security Domain

`security_enforcement` is not present in `.planning/config.json` — treated as enabled per the
default-enabled rule.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no | Out of scope — this phase has no auth surface |
| V3 Session Management | no | Out of scope |
| V4 Access Control | yes | Workspace Trust is VS Code's access-control primitive for this phase (SEC-02); PREFIX-root containment is a filesystem access-control boundary (SEC-06/SEC-07) |
| V5 Input Validation | yes | SEC-01's host/port validator; D-19/D-20's javaPath validation before spawn |
| V6 Cryptography | n/a | No new crypto in this phase — the existing SHA-256 JAR verification (`formatter-verifier.ts`) is unchanged, not introduced here |
| V12 File and Resources (ASVS 4.x numbering; "Files and Resources" in ASVS 5.x) | yes | SEC-06/SEC-07 path traversal containment; SEC-08 symlink/non-regular-file rejection before read |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Path traversal via `..` in a USE statement escaping a configured PREFIX root | Tampering / Elevation of Privilege (read outside intended sandbox) | Lexical containment check (`isPathInside`, D-10) before every `fsProvider.readFile` call fed by an untrusted-source path segment |
| Prefix-boundary bypass via a sibling directory sharing a string prefix (`/libs/foo2/` vs `/libs/foo`) | Elevation of Privilege | Segment-aware comparison (`path.relative`-based), not `String.prototype.startsWith` |
| TOCTOU symlink swap between `lstat` and `open`/read on a probed file | Tampering | `open()` with `O_NOFOLLOW` (refuse if the leaf is a symlink) + post-open `fstat().isFile()` re-check on the handle (D-17) |
| Untrusted workspace setting silently redirecting a config file read (`bbj.configPath`) | Tampering / Information Disclosure (a malicious repo pointing the config reader at an attacker-controlled path) | VS Code Workspace Trust: only the user-scoped (`inspect().globalValue`) or default value is honored until the user explicitly trusts the workspace (D-06) |
| Untrusted workspace setting redirecting the interop socket target (`bbj.interop.host`/`port`) | Tampering (connecting the language server to an attacker-controlled "java-interop" peer) | SEC-01's validator bounds the port to 1-65535 and requires a non-empty host string, falling back to a known-safe default on anything else; note this is validation, not a trust gate — `bbj.interop.host`/`port` are NOT gated behind Workspace Trust in this phase's decisions (D-01-D-04 only validate shape, they don't add an `isTrusted` check) — confirm this is intentional scope (the roadmap issue list #509/#510 is about validation, not trust-gating interop) |
| Unverified/PATH-ambient `java` binary being spawned by the formatter (supply-chain: a malicious `java` earlier on PATH) | Spoofing / Tampering | D-19/D-20's absolute-path + regular-file + executable-bit verification before every spawn, mirroring the existing SHA-256 JAR verification's "verify before trust" posture |

## Sources

### Primary (HIGH confidence — read directly this session)
- `bbj-vscode/src/language/config-path-resolver.ts` — full file read; injectable-deps pattern, `samePath` platform branching
- `bbj-vscode/src/bbj-home-layout.ts` — full relevant section read; `isExecutableFile`, `resolveBbjBinary`, `confineBbjExecutable`
- `bbj-vscode/src/language/java-interop.ts` (lines 240-300, 470-510) — `setConnectionConfig`, interop fields
- `bbj-vscode/src/language/bbj-ws-manager.ts` (lines 1-90, 273-300) — initialization options handling, `isExternalDocument()`
- `bbj-vscode/src/language/main.ts` (lines 185-280) — `onDidChangeConfiguration` handler
- `bbj-vscode/src/extension.ts` (lines 990-1110) — config push/sync listeners, `initializationOptions`, `synchronize`
- `bbj-vscode/src/language/bbj-document-builder.ts` (lines 1-25, 1050-1129) — `addImportedBBjDocuments`
- `bbj-vscode/src/language/bbj-scope.ts` (lines 1-58, 290-372) — `getBBjClassesFromFile`
- `bbj-vscode/src/decompile-io.ts` — full file read
- `bbj-vscode/src/document-formatter.ts` — full file read
- `bbj-vscode/src/formatter-verifier.ts` (lines 1-60) — SHA-256 verification pattern
- `bbj-vscode/package.json` — `capabilities`/`activationEvents`/`bbj.configPath`/`bbj.interop.*`/`bbj.formatter.*` sections, `vscode-languageclient` dependency declaration
- `bbj-vscode/node_modules/vscode-languageclient/lib/common/configuration.{js,d.ts}` — full file read; push/pull model middleware mechanics
- `bbj-vscode/node_modules/@types/vscode/index.d.ts` (grep-located lines) — `isTrusted`, `onDidGrantWorkspaceTrust` existence
- `bbj-vscode/test/lazy-prefix-loading.test.ts` — full file read; D-14's test model
- `bbj-vscode/test/document-builder.test.ts` (lines 1-100) — harness pattern
- `bbj-vscode/test/classes.test.ts` (lines 40-98) — D-13's absolute-path USE finding
- `bbj-vscode/test/decompile-io.test.ts` — full file read; temp-dir fixture pattern
- `bbj-vscode/test/bbj-home-layout.test.ts` (lines 1-70) — fixture-directory test pattern
- `bbj-vscode/test/document-formatter.test.ts` (lines 1-80) — `vi.mock('vscode')`/`vi.mock('child_process')` pattern
- `bbj-vscode/test/no-shell-command-construction.test.ts` — full file read; three-launcher pin, stale-comment finding
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` (lines 40-60) — `javaInteropHost`/`javaInteropPort` key-name finding
- `.planning/phases/110-workspace-settings-filesystem-trust/110-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md` (Phase 110 section), `.planning/config.json`, `.planning/codebase/TESTING.md`, `.planning/codebase/CONVENTIONS.md`

### Secondary (MEDIUM confidence)
- [VS Code Workspace Trust Extension Guide](https://code.visualstudio.com/api/extension-guides/workspace-trust) — D-08 default-behavior, `restrictedConfigurations`, config-change-on-trust-grant, fetched and quoted this session [CITED]

### Tertiary (LOW confidence)
- GitHub issue discussion on `fs.constants.O_NOFOLLOW`/`O_NONBLOCK` Windows availability — WebSearch result, not the primary Node.js docs page (which did not surface the specific platform-availability text via WebFetch this session) [ASSUMED, see Assumptions Log A1]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing installed versions confirmed directly (`vscode-languageclient` 10.1.0, vitest 4.1.10, Node 24 dev / >=22 required)
- Architecture: HIGH — every touch point's exact current code was read this session, not inferred from CONTEXT.md's line-number estimates
- Pitfalls: HIGH for Pitfalls 1-4 (each grounded in code/library source read this session); MEDIUM for Pitfall 5 (Windows-specific claim not verifiable on this Linux container, see A1)

**Research date:** 2026-09-26
**Valid until:** 30 days (stable, internal codebase; `vscode-languageclient`/`@types/vscode` pins are not expected to move mid-phase since `commit_docs`/dependency updates are handled by Dependabot in a separate later phase per STATE.md)
