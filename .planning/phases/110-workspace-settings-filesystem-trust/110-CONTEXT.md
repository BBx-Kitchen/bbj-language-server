# Phase 110: Workspace Settings & Filesystem Trust - Context

**Gathered:** 2026-09-26
**Status:** Ready for planning
**Mode:** `--auto` (every decision below is the recommended default, chosen without user prompts; see 110-DISCUSSION-LOG.md)

<domain>
## Phase Boundary

Values that a workspace controls can no longer send the language server or the VS Code extension
somewhere the user did not choose. This covers the interop host and port, `bbj.configPath`,
USE-statement paths, prefix membership checks, the decompile file probes and the formatter's Java
binary. Requirements: SEC-01, SEC-02, SEC-06, SEC-07, SEC-08, SEC-09, REF-02. Closes #509, #510,
#511, #526, #579, #585, #605, #581.

Out of scope: any new capability, IntelliJ trust handling (IntelliJ has no Workspace Trust
counterpart in scope), containment of `bbj.configPath` itself (roadmap decision: it stays
deliberately un-anchored, see D-05), and Java class data from the peer (Phase 111).

</domain>

<decisions>
## Implementation Decisions

### Interop host/port validation (SEC-01, REF-02)
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

### Workspace Trust gate for `bbj.configPath` (SEC-02)
- **D-05:** Do not add containment to `configPath`. Issue #511 proposes that, but the roadmap
  overrides it: `configPath` stays un-anchored so that system-wide config files keep working, and
  only the *workspace-scoped* value is gated behind Workspace Trust. Carried forward from the
  v4.7 roadmap decision. — **Reversibility:** reversible — client-side only.
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
  — **Reversibility:** costly — a `limited` or `true` declaration changes what runs in untrusted
  workspaces for every user; do not add one in this phase.
- **D-09:** IntelliJ is unchanged. Its `configPath` handoff has no trust concept in scope (roadmap
  note).

### USE-path containment (SEC-06)
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
  stop resolving, and reports any such path before planning. — **Reversibility:** reversible.
- **D-14:** Test: drive `addImportedBBjDocuments` with a spy `FileSystemProvider` and a prefix
  list. Assert that no `readFile` call targets a path outside the roots (a `../` escape and an
  absolute path), and that an in-root import still loads. Follow the project rule of using
  `parseHelper`-style setup, not `DocumentBuilder.build`, so the test never reaches :5008.

### Prefix membership on segment boundaries (SEC-07)
- **D-15:** `isExternalDocument()` in `bbj-ws-manager.ts` uses `isPathInside` from D-10 instead of
  `fsPath.startsWith`. `/libs/foo2/x.bbj` is not inside `/libs/foo`. `/libs/foo/x.bbj` and the
  prefix directory itself (with or without a trailing separator) still are. Empty prefixes are
  still skipped. The stale `// TODO check that document is part of the workspace folders` stays
  out of scope.

### Non-regular files in decompile probes (SEC-08)
- **D-16:** `statSize` uses `lstat` and returns `undefined` unless `isFile()` is true. Symlinks,
  directories, FIFOs, sockets and devices all count as not-a-file.
- **D-17:** `isTokenizedFile` calls `lstat` first and returns `false` unless `isFile()` is true.
  It never opens a FIFO, which would block. It then opens with `O_NOFOLLOW | O_NONBLOCK` where the
  platform defines them. On Windows, where they are undefined, it opens plainly after the `lstat`
  check. It re-checks with `fstat().isFile()` on the handle to close the swap window. Tests create
  a real symlink, a directory and a FIFO in a temp dir (the FIFO test is skipped on Windows).

### Formatter Java binary (SEC-09)
- **D-18:** New setting `bbj.formatter.javaPath` (string, default `""`), placed with the other
  `bbj.formatter.*` settings. Its scope is **`machine`**, so a workspace `.vscode/settings.json`
  cannot choose the binary to be spawned. The description says it is an absolute path to a `java`
  executable and that empty means "look up `java` on PATH". — **Reversibility:** costly — setting
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` § "Phase 110: Workspace Settings & Filesystem Trust" — goal, 5 success criteria, planning note on SEC-02 vs `config-path-resolver.ts`
- `.planning/REQUIREMENTS.md` — SEC-01, SEC-02, SEC-06..09, REF-02 wording
- GitHub issues #509, #510, #511, #526, #579, #585, #605, #581 (`gh issue view <n>`) — failure scenarios and acceptance criteria; #511's proposed containment is overridden by D-05

### Code (from roadmap Code line)
- `bbj-vscode/src/language/java-interop.ts` — `setConnectionConfig` (~line 489), fields at ~251
- `bbj-vscode/src/language/bbj-ws-manager.ts` — initialization options (~line 72), `isExternalDocument()` (~line 273)
- `bbj-vscode/src/language/main.ts` — `onDidChangeConfiguration` handler (~line 193, interop part ~263)
- `bbj-vscode/src/language/config-path-resolver.ts` — header comment documents the un-anchored design (D-05); model for a plain, injectable, unit-testable module
- `bbj-vscode/src/extension.ts` — `initializationOptions` / `synchronize` (~line 1090), `bbj.configPath` change listener (~line 1036)
- `bbj-vscode/src/language/bbj-document-builder.ts` — `addImportedBBjDocuments` (~line 1077)
- `bbj-vscode/src/language/bbj-scope.ts` — `getBBjClassesFromFile` (~line 330)
- `bbj-vscode/src/decompile-io.ts` — `isTokenizedFile`, `statSize`
- `bbj-vscode/src/document-formatter.ts` — `cp.spawn('java', …)` (~line 144), SHA-256 verification (~line 105)
- `bbj-vscode/package.json` — `bbj.formatter.*` settings (~line 410), `bbj.configPath` (~616), `bbj.interop.*` (~636); no `capabilities` block today

### Project rules
- `CLAUDE.md` — test pattern, shell/file-access rules
- `.planning/codebase/TESTING.md`, `.planning/codebase/CONVENTIONS.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `config-path-resolver.ts`: the template for a Langium-free module with injectable fs probes (`ConfigPathProbeDeps`). The interop validator, the path helper and the java resolver follow the same shape.
- The formatter's existing verification-refusal rejection path: reuse it for the D-19/D-20 errors.

### Established Patterns
- The defaults currently disagree three ways (`'localhost'` in two call sites, `'127.0.0.1'` in `setConnectionConfig`). REF-02 exists to collapse them.
- Test setup uses `createBBjServices(EmptyFileSystem)` and `parseHelper`, never `DocumentBuilder.build` (which triggers CPL/interop on :5008).
- vitest must run with cwd = `bbj-vscode` (`npm --prefix bbj-vscode test` or `cd …/bbj-vscode && npx vitest run <file>`).
- Source and test comments must not carry planning ids (D-xx, plan numbers). Issue numbers are fine.

### Integration Points
- The server receives interop settings from both IDE hosts. Validating inside the server (D-01) covers IntelliJ without IntelliJ changes.
- The `synchronize.configurationSection: 'bbj'` push is the second path by which a workspace `configPath` reaches the server (besides `initializationOptions`), so both must go through the D-06 helper.

</code_context>

<specifics>
## Specific Ideas

- Criterion 3 asks for a test proving *nothing outside the roots is opened*. Assert on the spy's recorded `readFile` targets, not only on the resulting documents.
- Criterion 4's example (`/libs/foo2/` vs prefix `/libs/foo`) should appear literally as a test case.

</specifics>

<deferred>
## Deferred Ideas

- Containment of `bbj.configPath` to the workspace root (#511's own proposal): rejected by roadmap decision, not deferred.
- An explicit `untrustedWorkspaces` `limited` declaration that would make the extension run in Restricted Mode: a separate product decision, not this phase (D-08).
- The `isExternalDocument()` TODO about workspace-folder membership: not required by SEC-07.

### Reviewed Todos (not folded)
- `2026-09-20-linking-interop-failures-survive-class-warmup`: scheduled as TEST-05 in Phase 116; matched only on generic keywords.
- `2026-09-20-phase-97-code-review-follow-ups`: scheduled as FIX-04 in Phase 114.
- `2026-09-24-unknown-java-member-linking-warning-extras`: scheduled as FIX-03 in Phase 111.

</deferred>

---

*Phase: 110-workspace-settings-filesystem-trust*
*Context gathered: 2026-09-26*
