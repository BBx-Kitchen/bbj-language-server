---
phase: "84"
slug: "config-path-resolution-discoverability-foundation"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-06"
register_authored_at_plan_time: true
---

# Phase 84 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time in the six PLAN.md `<threat_model>` blocks (T-84-01 … T-84-24 plus the per-plan supply-chain row T-84-SC, declared identically by all six plans); verified after execution by `/gsd-secure-phase 84` at ASVS L1 (grep-depth mitigation presence against the merged source on `main` at `83421be0`, with the pinning test named per row; whole IntelliJ module 565/565 + 5 new, phase-84 vitest files 68/68 + 4 new on 2026-09-06). No SUMMARY carried a `## Threat Flags` entry. The phase touched `bbj-vscode/` (language server + extension host) and `bbj-intellij/`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| IDE settings → language server | `initializationOptions.configPath` / `didChangeConfiguration` carry an arbitrary user string into path resolution | user-supplied path string |
| language server → IDE client | The pushed `bbj/resolvedConfigPath` notification (and the request of the same name) crosses the LSP wire into both VS Code and IntelliJ | resolved path, `source`, `exists`, `problem` |
| resolved/cached path → spawned `bbj`/`bbjcpl` process | The string becomes a `-c` argv element on both hosts (GUI run, compile, plain run) | argv element |
| resolved/cached path → EM web-run registration | The BUI/DWC path writes the value into the registered EM application | registration value |
| workspace / plugin settings → host pre-answer branch | Both hosts read the raw `bbj.configPath` / `BbjSettings.State.configPath` verbatim before any server push arrives | raw setting |
| open / VFS document path → comparison | An arbitrary file's path (`TextDocument.uri.fsPath` / `VirtualFile.getPath()`) is compared against the resolved path to decide language or file-type association | document path |
| language server → LSP4IJ JSON boundary | Notification and request result are deserialized by LSP4J's Gson into `ConfigModels.ResolvedConfigPathResult` | JSON payload |
| cached path → indexing / EDT threads | The IntelliJ file-type override reads the cache concurrently with the notification-thread write; a re-parse fires on cache change | shared volatile field |
| plugin TextMate bundle → highlighter | The bbx grammar is resolved from plugin resources by a constant filename to drive the config file's lexer | grammar resource |
| settings text field → filesystem probe | A user-typed string is stat-ed by the debounced settings lookup on both hosts | typed path |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-84-01 | Tampering | `config-path-resolver.ts` path handling | medium | mitigate | `canonicalizeConfigPath` (`config-path-resolver.ts:113-123`: `path.resolve` + `path.normalize` + `fs.realpathSync.native`), non-absolute input rejected with a `problem` (`:174-181`), `expandHome` expands a leading `~` only (`:93-101`); `config-path-resolution.test.ts` describes `canonicalizeConfigPath`, `expandHome`, `resolveConfigPath` | closed |
| T-84-02 | Tampering | EM Config sentinel reaching argv | high | mitigate | `normalizeConfigSetting` collapses the sentinel, blank and whitespace to `''` (`config-path-resolver.ts:76-85`); `config-path-resolution.test.ts` `normalizeConfigSetting` + "blank, whitespace-only and sentinel settings resolve identically to unset" | closed |
| T-84-03 | Information disclosure | resolved path echoed in the notification and the server log | low | accept | See AR-84-01 | closed |
| T-84-04 | Denial of service | `realpathSync` on an unreachable network mount | low | mitigate | Every probe wrapped: `canonicalizeConfigPath` try/catch falls back to the plain absolute string (`:109-123`), `defaultFileExists` wraps `fs.accessSync` (`:57-64`); test "falls back to the plain absolute string for a non-existent path" | closed |
| T-84-05 | Spoofing | a workspace file whose path canonicalizes onto the resolved config path | medium | mitigate | `isActiveConfigPath` canonicalizes `fsPath` before `samePath` (`config-path-cache.ts:66-72`); `samePath` NFC-normalizes and case-folds per platform (`config-path-resolver.ts:130-137`); `config-file-association.test.ts:152`, `config-path-resolution.test.ts` `samePath` symlink case | closed |
| T-84-06 | Tampering | language association applied to an unrelated document | low | mitigate | `applyConfigAssociation` gated on `isActiveConfigPath` and the `file` scheme (`extension.ts:597-603`); exactly one `setTextDocumentLanguage(doc, CONFIG_LANGUAGE_ID)` call site (`:601`; `:613` releases with `undefined`); test "a document that is not the active config path is never switched" | closed |
| T-84-07 | Information disclosure | the warning and the inactive-config hint print a path into the UI | low | accept | See AR-84-02 | closed |
| T-84-08 | Denial of service | re-association thrash on every document change | medium | mitigate | Early return when `languageId` is already `CONFIG_LANGUAGE_ID` (`extension.ts:599`); review fix WR-01 removed the `onDidChangeTextDocument` trigger entirely (`:907-911`), so only open, server push and settings change re-associate; test "a document already carrying bbx-config is left alone" | closed |
| T-84-09 | Tampering | argv construction in `buildRunArgv` / `buildWebRunArgv` | high | mitigate | Args built as a `string[]` (`process-args.ts:115-193`) and passed to `execFile(file, args)` (`process-runner.ts:57,83`) — never a shell string; `test/no-shell-command-construction.test.ts` | closed |
| T-84-10 | Tampering | EM Config sentinel reaching a `-c` element | high | mitigate | `buildRunArgv` (`process-args.ts:121`) and `buildWebRunArgv` (`:171`) both refuse `EM_CONFIG_SENTINEL` as a second layer behind the resolver; `config-path-consumers.test.ts:22,67` | closed |
| T-84-11 | Elevation of privilege | `bbjcpl` reading an attacker-chosen config file | medium | mitigate | `readerWithResolvedConfigFile` substitutes the canonical resolved path only when no explicit `typeChecking.configFile` and no `prefixDirectories` are set (`compiler-options.ts:575-597`); tests "an explicit typeChecking.configFile is not overwritten", "with prefix-directories set, no injection occurs" | closed |
| T-84-12 | Information disclosure | Show-config error message printing the path | low | accept | See AR-84-03 | closed |
| T-84-13 | Tampering | Gson deserialization of the new DTO | medium | mitigate | `ConfigModels.ResolvedConfigPathResult` holds only `String`/`String`/`boolean`/`String` fields (`ConfigModels.java:15-24`); `ConfigModelsJsonBoundaryTest` round-trips through the real LSP4J `MessageJsonHandler` incl. null path/problem | closed |
| T-84-14 | Denial of service | notification handler blocking a platform thread | medium | mitigate | `BbjLanguageClient.resolvedConfigPath` (`:66-93`) performs one synchronous volatile write via `BbjConfigPathService.update`, defers only the balloon into `invokeLater` behind a `project.isDisposed()` guard, never calls back into the server; `BbjLanguageClientResolvedConfigPathSourceGuardTest` (5) | closed |
| T-84-15 | Tampering | stale cache mis-classifying a file during indexing | medium | mitigate | `private volatile ConfigModels.ResolvedConfigPathResult resolvedConfigPath` (`BbjConfigPathService.java:30`); `BbjConfigPathServiceSourceGuardTest#theCachedResultFieldIsVolatile` | closed |
| T-84-16 | Information disclosure | resolved path in the balloon and settings UI | low | accept | See AR-84-04 | closed |
| T-84-17 | Spoofing | a project file masquerading as the config file | medium | mitigate | `BbjConfigFileTypeOverrider` delegates to `isConfigFile` (`:19-24`); `isConfigFileName` matches only `ConfigPaths.samePath(activePath, filePath)` or the fixed default filenames (`BbjConfigPathService.java:131-136`), granting only config-file (non-BBj) treatment; `BbjConfigFileTypeOverriderSourceGuardTest#overriderReachesTheSharedPredicateExactlyOnce…` | closed |
| T-84-18 | Denial of service | the overrider stalling indexing | high | mitigate | Overrider body is a volatile read plus string compares — no filesystem probe, lock or server call (`BbjConfigFileTypeOverrider.java:19-24`); source guards `overriderDoesNoDirectFileConstruction`, `overriderDoesNoVirtualFileContentRead`, `overriderMakesNoComposerServerProxyCall` | closed |
| T-84-19 | Tampering | config file reaching the language server and parsed as BBj | medium | mitigate | `BbjConfigFileType` registered over `BbxConfigLanguage`, never `BbjLanguage` (`BbjConfigFileType.java:12-17`); `BbjConfigFileTypeRegistrationTest#exactlyOneLanguageMappingExistsAndItNamesBbj` (`:126-132`) | closed |
| T-84-20 | Denial of service | unbounded re-parsing on repeated pushes | medium | mitigate | `update()` early-returns when the active path is unchanged (`BbjConfigPathService.java:54-59`); server-side `notifyResolvedConfigPath` dedups by serialized value (`bbj-notifications.ts:52-58`); `BbjConfigFileTypeOverriderSourceGuardTest#serviceCallsReparseFilesExactlyOnceInsideInvokeLater`, `config-path-resolution.test.ts` `notifyResolvedConfigPath dedup` | closed |
| T-84-21 | Tampering | EM Config sentinel reaching `-c` on the plain GUI run | high | mitigate | `ConfigPaths.configPathArg` returns `null` through `normalizeSetting` (`ConfigPaths.java:84-90`); `BbjRunActionBase.getConfigPathArg()` delegates to it (`:360-361`); `ConfigPathsTest#configPathArgReturnsNullForNullEmptyAndSentinelInput`, `BbjRunActionConfigPathTest` | closed |
| T-84-22 | Tampering | empty or sentinel path written into the EM app registration | high | mitigate | `buildWebRunCommandLine` aborts with a named notification when `configPath.isBlank()` (`BbjRunActionBase.java:534-538`); `BbjRunBuiAction`/`BbjRunDwcAction` delegate to it (review fix WR-02); `BbjRunActionConfigPathSourceGuardTest#sharedWebRunHelperGuardsTheBlankConfigPathBeforeLaunching`, `#buiAndDwcActionsEachDelegateToTheSharedWebRunHelper…` | closed |
| T-84-23 | Information disclosure | config path printed into the run notification | low | accept | See AR-84-05 | closed |
| T-84-24 | Denial of service | settings validator stat-ing a path on every keystroke | medium | mitigate | `BbjSettingsLookups.lookupConfig` (`:119-145`) runs only from the `configDebouncer` `KeystrokeDebouncer` (`BbjSettingsComponent.java:232-239`); the `ComponentValidator` (`:156-177`) reads only the cached `lastConfigLookup`; `BbjSettingsComponentSourceGuardTest#noFilesystemOrSubprocessHelperIsCalledDirectly` | closed |
| T-84-SC | Tampering | npm/pip/cargo installs (declared by plans 01–06) | high | mitigate | No package-manager install task in any plan; `git diff ac35a77d~1 98a1f65c` over `bbj-vscode/package.json`, `package-lock.json`, `bbj-intellij/build.gradle.kts`, `bbj-intellij/gradle/` and `java-interop/build.gradle` shows a single 4-line `contributes` change in `package.json` (command title and setting description strings); lockfile, Gradle files and wrapper untouched | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-84-01 | T-84-03 | The resolved config path is the user's own configured value, already visible in the settings UI; it carries no secret or token material, so its presence in the `bbj/resolvedConfigPath` payload and the server log discloses nothing the user does not already control. ASVS L1 local boundary | plan 84-01 threat model | 2026-09-06 |
| AR-84-02 | T-84-07 | The missing-config warning and the inactive-config hint print the same user-supplied path already visible in settings; no credential enters these strings | plan 84-02 threat model | 2026-09-06 |
| AR-84-03 | T-84-12 | The Show-config error names only the path the user configured (or its computed default) | plan 84-03 threat model | 2026-09-06 |
| AR-84-04 | T-84-16 | The IntelliJ balloon and Settings UI surface the identical resolved path; the plugin's rule that secrets travel only via environment variables, never argv or notifications, is unaffected | plan 84-04 threat model | 2026-09-06 |
| AR-84-05 | T-84-23 | The run notification names only the configured path; EM credentials continue to travel exclusively via `BBJ_EM_*` environment variables | plan 84-06 threat model | 2026-09-06 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-06 | 25 | 25 | 0 | /gsd-secure-phase 84 (gsd-security-auditor, ASVS L1 grep-depth; orchestrator wrote the file) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-06
