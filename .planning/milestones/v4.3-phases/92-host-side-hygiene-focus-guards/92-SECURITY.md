---
phase: "92"
slug: "host-side-hygiene-focus-guards"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-13"
---

# Phase 92 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| editor/menu state → process launch | the command decides which file path is handed to bbj, bbjcpl or bbjlst | file path (user workspace) |
| command argument → process launch | `params.fsPath` can come from another extension's `executeCommand` call | file path (other extensions) |
| live editor buffer → formatter stdin → edits applied to the buffer | formatted output replaces the whole document | user source text |
| IntelliJ file-type resolution → status-bar UI | a UI-only visibility decision; no data or process crosses it | none (UI state) |
| filesystem state from earlier runs → decompile result opened in the editor | a leftover `<input>.lst` could be presented as this run's source | decompiled listing |
| extension host → user's program files | the delete step removes a file next to the user's input | file deletion |
| extension host lifecycle → extension registrations | activation and deactivation own every command, provider and handler | none (registrations) |
| automated evidence / rebuilt artifact → phase closure and tester install | a stale VSIX or zip would make closure claims and UAT test old code | build artifacts |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-92-01 | Tampering | `run`/`compile`/`decompile` target choice | medium | mitigate | `target-resolution.ts` `resolveRunTarget` is argument-first; the active-editor fallback requires `isRunnableBbjDocument` (`languageId === 'bbj'` and extension not `.bbjt`); unit-tested in `test/target-resolution.test.ts` | closed |
| T-92-02 | Denial of Service | seven command handlers on an undefined `params` | low | mitigate | `Commands.cjs` `runTargetOrWarn`/`decompileTargetOrWarn` return after `NO_ACTIVE_BBJ_FILE_MESSAGE`; source guards in `test/target-resolution.test.ts` pin the resolver call before `getBBjHome` in each body | closed |
| T-92-03 | Information Disclosure | EM credential prompt in `bbj.runBUI` / `bbj.runDWC` | low | mitigate | `extension.ts` resolves the target (lines 788, 800) before `ensureValidToken` (lines 793, 805); source-guarded in `test/target-resolution.test.ts` | closed |
| T-92-04 | Tampering | passed `fsPath` used without a language check | low | accept | see Accepted Risks Log | closed |
| T-92-05 | Tampering | `provideDocumentFormattingEdits` in-flight sharing | medium | mitigate | `document-formatter.ts` line 63 shares only when `inFlight.content === documentContent`; race tests in `test/document-formatter.test.ts` | closed |
| T-92-06 | Denial of Service | in-flight map growth | low | mitigate | `document-formatter.ts` lines 69-70 delete the entry on settle when its promise is still current; "spawns again after settle" test | closed |
| T-92-07 | Denial of Service | `FILE_EDITOR_MANAGER` subscription leak after widget disposal | low | mitigate | both widgets subscribe on the existing `messageBusConnection` and `dispose()` calls `disconnect()`; `BbjStatusBarWidgetSourceGuardTest` asserts one subscription and exactly one `disconnect()` | closed |
| T-92-08 | Spoofing | config file shown as a BBj program | low | mitigate | `BbjFileVisibility.isBbjProgramFileTypeName` exact-matches `"BBj"` from `file.getFileType().getName()`; `BbjFileVisibilityTest` covers `BBx Config` plus drift guards on `BbjFileType`/`plugin.xml`; live check passed in 92-UAT.md | closed |
| T-92-09 | Tampering | `waitForDecompileOutput` accepting a stale listing | medium | mitigate | `decompile-io.ts` `deleteLeftoverLst` runs before bbjlst (`Commands.cjs` `decompileInPlace`); mtime gate removed; reworked P62-D2-011 test and source guard in `test/decompile-io.test.ts` | closed |
| T-92-10 | Tampering | `deleteLeftoverLst` deleting the user's input | medium | mitigate | target always `lstPathFor(inputPath)` (`inputPath + '.lst'`); `.lst`-input test asserts the input file is untouched | closed |
| T-92-11 | Denial of Service | undeletable leftover (lock, permissions) | low | mitigate | `decompile-io.ts` lines 58-61: ENOENT resolves, any other error throws naming path and reason before `execWithProgress`; fail-closed test | closed |
| T-92-12 | Denial of Service | `activate()` duplicate `registerCommand` crash on re-activation | medium | mitigate | all 14 `registerCommand` calls in `extension.ts` are wrapped in `context.subscriptions.push(...)`; `test/extension-activation.test.ts` double-activate test against a duplicate-throwing mock plus negative control | closed |
| T-92-13 | Denial of Service | accumulating notification handlers and formatting providers | low | mitigate | formatting provider and the three `client.onNotification` handlers each wrapped in `context.subscriptions.push(` (extension.ts ~869, 945, 964, 975); runtime membership test in `test/extension-activation.test.ts` | closed |
| T-92-14 | Repudiation | config reload silently stops after a restart disposes handlers | low | mitigate | restart gate untouched; `test/config-reload-host.test.ts` 23/23 passing | closed |
| T-92-15 | Repudiation | phase closed while installed bundles still ship old code | medium | mitigate | 92-06-SUMMARY records BASE, VSIX and zip sha256 digests and marker counts inside the VSIX host bundle and plugin jar | closed |
| T-92-16 | Tampering | UAT run against artifacts built before code-review fixes | low | mitigate | human check required `clean buildPlugin` from the final tree; UAT confirmed zip sha256 `5e57a632…4f89d` and bundled `main.cjs` byte-identical to the final build before testing | closed |
| T-92-SC | Tampering | npm/Gradle installs | low | accept | see Accepted Risks Log | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-92-01 | T-92-04 | Trust unchanged: argv is built by `process-args.ts` and launched by `process-runner.ts` via `execFile(resolved.file, argv.args, …)` with no shell (no `shell: true` in `src/Commands`); the menus already filter the argument | 92-01 plan threat model | 2026-09-13 |
| AR-92-02 | T-92-SC | No dependency added: `git diff 3ec25f02` over `bbj-vscode/package.json`, `package-lock.json`, `bbj-intellij/build.gradle.kts`, `gradle/libs.versions.toml` is empty | 92-01..92-06 plan threat models | 2026-09-13 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-13 | 17 | 17 | 0 | /gsd-secure-phase (orchestrator, ASVS L1 grep-depth; register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-13
