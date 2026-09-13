---
phase: "84"
slug: "config-path-resolution-discoverability-foundation"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-06"
reconstructed: true
---

# Phase 84 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed from PLAN/SUMMARY artifacts by `/gsd-validate-phase 84` after execution (State B): no VALIDATION.md was seeded at plan time.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Two modules. `bbj-vscode`: Vitest 4.x (`npm test` = `vitest run`), mocked `vscode` module for host-side tests, real `BBjWorkspaceManager` on `NodeFileSystem` for the server-side resolver tests. `bbj-intellij`: JUnit 5.10 via Gradle `useJUnitPlatform()` (plain JVM, no IntelliJ platform test fixture). |
| **Config file** | `bbj-vscode/vitest.config.ts`; `bbj-intellij/build.gradle.kts` (JDK 17 daemon toolchain, phase 78) |
| **Quick run command** | `cd bbj-vscode && npx vitest run test/config-path-resolution.test.ts test/config-file-association.test.ts test/config-path-consumers.test.ts --maxWorkers=2` and `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --rerun --offline --tests 'com.basis.bbj.intellij.config.*' --tests 'com.basis.bbj.intellij.actions.BbjRunActionConfigPath*' --tests 'com.basis.bbj.intellij.BbjSettingsLookupsConfigPathTest' --tests 'com.basis.bbj.intellij.lsp.*SourceGuardTest' --console=plain -q` |
| **Full suite command** | `cd bbj-vscode && npx vitest run --maxWorkers=2` (whole-suite baseline: 12 known environment-drift failures in `linking.test.ts` + `issue447`, see memory) and `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --rerun --offline --console=plain -q` |
| **Estimated runtime** | phase-84 vitest files ~3 s; IntelliJ targeted classes ~5 s on a warm daemon; whole IntelliJ module ~4 s warm / ~2 min cold |

Prerequisites: `bbj-vscode/out/language/main.cjs` must exist for the Gradle packaging tasks (phase 78 fail-fast bundle check). No language server, BBj install or IDE is needed for any phase-84 test: the server-side resolver is exercised directly, the host side runs against a mocked `vscode`, and the IntelliJ side is plain Java (`ConfigPaths`, the static decision helpers on `BbjConfigPathService`, `BbjSettingsLookups`) plus whole-file source guards over the platform-bound classes. `Commands.cjs` cannot be mocked (`vi.mock('vscode')` never reaches its native `require`), so its coverage is source-guard over extracted function bodies. Gradle must be run with `--rerun`, otherwise it reports UP-TO-DATE without executing.

---

## Sampling Rate

- **After every task commit:** Run the plan's targeted test file(s) / class(es)
- **After every plan wave:** Run the quick run command (both modules)
- **Before `/gsd-verify-work`:** Both quick runs green; whole IntelliJ module green (0 failures, 0 errors)
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

Command legend: **V1** `npx vitest run test/config-path-resolution.test.ts`; **V2** `npx vitest run test/config-file-association.test.ts`; **V3** `npx vitest run test/config-path-consumers.test.ts`; **VC** the nine companion/regression vitest files named in the PLAN verify blocks (`extension-activation`, `compile-request`, `notifications`, `lazy-prefix-loading`, `use-project-root`, `command-argv-injection`, `run-call-file-resolution`, `compiler-options`, `compiler-options-single-table`); **G** the targeted Gradle command from the Quick run row; **PJ** the plan 84-03 task 2 `node -e` manifest script against `bbj-vscode/package.json`. All vitest commands run from `bbj-vscode/` with `--maxWorkers=2`.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 84-01-01 | 01 | 1 | CFG-01, CFG-02 (D-01, D-02, D-04, D-11, D-12, D-13) | — | `resolveConfigPath` is the single canonical resolver: sentinel/blank collapse to unset, leading-tilde-only expansion, relative paths rejected with a `problem`, symlink + NFC canonicalization, `source` discriminator, `exists`/`problem`; `bbj/resolvedConfigPath` request and identically shaped push | unit + end-to-end (real resolver, stub wsManager, mock Connection) | V1 — describes `normalizeConfigSetting` (3), `expandHome` (2), `canonicalizeConfigPath` (2), `samePath` (3), `resolveConfigPath` (9), request handler + notification end-to-end (1), dedup (1) | ✅ | ✅ green 21 (the win32/darwin case-fold case early-returns on Linux — declared backstop) |
| 84-01-02 | 01 | 1 | CFG-02 (D-02, D-13) | — | `initializeWorkspace` reads PREFIX only through `getResolvedConfigPath()`; dead directory scan deleted; missing file → no prefixes, one warning naming the path, `exists:false` + `problem` | unit (real `BBjWorkspaceManager` on `NodeFileSystem`) | V1 `initializeWorkspace reads PREFIX through the resolver` (4); VC `lazy-prefix-loading` (1), `use-project-root` (1) | ✅ | ✅ green 4 + 2 |
| 84-01-03 | 01 | 1 | CFG-01 (D-01, D-02, D-14) | — | A settings change re-resolves and re-pushes once per distinct value on both sides of the `workspaceInitialized` gate; last push wins; no PREFIX reload | unit + source-guard (main.ts call-site count) | V1 `re-resolve and re-push on a config-path setting change` (4); VC `notifications` (3) | ✅ | ✅ green 4 + 3 |
| 84-02-01 | 02 | 2 | CFG-02 (D-01, D-02, D-03, D-04, D-13) | — | Host warm cache: pushed path wins; before the first answer only the explicit setting (never a derived home default); null push clears; `isActiveConfigPath` via shared `samePath`; `shouldWarnOnce` dedup; missing-file `showWarningMessage` fires once per distinct path | unit (mocked vscode) | V2 `config-path-cache` (7), `missing config file warning` (4) | ✅ | ✅ green 7 + 4 |
| 84-02-02 | 02 | 2 | CFG-02 (D-05, D-14, D-16, D-02) | — | `applyConfigAssociation` on activation sweep, `onDidOpenTextDocument`, `onDidChangeConfiguration` and the push handler; reopen re-associates; idempotent; `.bbj`-named config still `bbx-config`; old path released on change even when the settings listener already fired (CR-01) | unit (mocked vscode) | V2 `bbx-config editor association` (8); VC `extension-activation` (2) | ✅ | ✅ green 8 + 2 (the per-keystroke `onDidChangeTextDocument` trigger was removed by review fix WR-01; Revert-File survival is manual, UAT #1) |
| 84-02-03 | 02 | 2 | CFG-02 (D-08, D-05, D-02) | — | SETOPTS composer hint names the active config file when the open `bbx-config` document is a different file; silent when none; composer still opens; QA rows 10–11 added | unit (exported `argForActiveEditor`) + manual | V2 `inactive-config hint in the SETOPTS composer` (5); `QA/FULL-TEST-CHECKLIST.md` VS Code rows 10, 11 | ✅ | ✅ green 5; live UAT #1, #2 |
| 84-03-01 | 03 | 3 | CFG-01 (D-03, D-10, D-12) | — | `buildRunArgv` omits `-c` for the sentinel and `buildWebRunArgv` blanks the positional; Show-config / GUI run / web run read `getActiveConfigPath`, error and do nothing when unconfigured or missing, never fall back to the home default | unit (process-args) + source-guard (Commands.cjs bodies) | V3 `buildRunArgv / buildWebRunArgv refuse the EM Config sentinel` (5), `Commands.cjs - Show-config and run paths read the resolved config path` (7); VC `command-argv-injection` (25), `run-call-file-resolution` (6) | ✅ | ✅ green 12 + 31; live launch UAT #7 |
| 84-03-02 | 03 | 3 | CFG-01 (D-10, D-11) | — | `bbj.configPath` description states absolute-only + tilde expansion + default; `bbj.config` title no longer implies `config.bbx` ("Show the Active Config File"); `bbx-config` filenames array unchanged | packaging (manifest script) | PJ | ✅ | ✅ green ("package.json contributions OK") |
| 84-03-03 | 03 | 3 | CFG-01 (D-09) | — | `readerWithResolvedConfigFile` injects `-c` only when type checking is on, no explicit configFile and no prefixDirectories; explicit wins; exactly one `-c`; argv order unchanged; no manufactured `-c`/`-P` conflict | unit | V3 `compiler-options - readerWithResolvedConfigFile` (7); VC `compile-request` (13), `compiler-options` (50), `compiler-options-single-table` (3) | ✅ | ✅ green 7 + 66 |
| 84-04-01 | 04 | 2 | CFG-01, CFG-02 (D-01, D-04, D-12) | — | `ConfigPaths.normalizeSetting/samePath/configPathArg` mirror the TS resolver (injectable OS name; case-fold and separator normalization only on win32/darwin — CR-02, IN-04); DTO round-trips through LSP4J `MessageJsonHandler` incl. null path/problem | unit + JSON boundary | G `config.ConfigPathsTest` (18), `config.ConfigModelsJsonBoundaryTest` (2) | ✅ | ✅ green 18 + 2 |
| 84-04-02 | 04 | 2 | CFG-01, CFG-02 (D-02, D-06, D-08, D-13, D-14) | — | `BbjConfigPathService`: volatile cache, last push wins, explicit-setting fallback verbatim, empty when neither, `isConfigFile`/`isActiveConfigFile`, `shouldWarnOnce`; registered as an application service | unit (static helpers) + source-guard | G `ConfigPathsTest` (`resolveActivePath*`, `isConfigFileName*`, `isDefaultConfigFilenameIsCaseInsensitive`, `lastPushWins…`, `shouldWarnOnce…`), `config.BbjConfigPathServiceSourceGuardTest` (5) | ✅ | ✅ green |
| 84-04-03 | 04 | 2 | CFG-01 (D-01, D-02, D-13, D-14) | — | `@JsonRequest("bbj/resolvedConfigPath")` on the single `BbjComposerServer`; `@JsonNotification` handler on `BbjLanguageClient` writes the cache synchronously, balloon inside `invokeLater` once per path, returns early when the file exists; cross-language method-name contract | contract + source-guard | G `composer.ComposerRequestContractTest` (4), `composer.ComposerFlowTest` (14), `lsp.Lsp4ijOverrideSiteSourceGuardTest` (7), `lsp.BbjLanguageClientResolvedConfigPathSourceGuardTest` (5) | ✅ | ✅ green 4 + 14 + 7 + 5; balloon rendering UAT #6 |
| 84-05-01 | 05 | 3 | CFG-02 (D-06, D-07) | — | Distinct `BbxConfigLanguage` + `BbjConfigFileType` (no parser), config icon, `<fileType>` with `fileNamesCaseInsensitive` and no `extensions`; exactly one LSP4IJ language mapping and it names BBj | packaging (plugin.xml assertions) + build | G `config.BbjConfigFileTypeRegistrationTest` (`configFileTypeEntryHasNoExtensionsAttribute`, `exactlyOneLanguageMappingExistsAndItNamesBbj`) | ✅ | ✅ green |
| 84-05-02 | 05 | 3 | CFG-02 (D-06, D-07) | — | `BbxConfigSyntaxHighlighterFactory` resolves the bbx grammar by the constant `config.bbx`, not the opened file's name; `editorHighlighterProvider` + `lang.syntaxHighlighterFactory` registered for the config type | packaging + source-guard | G `BbjConfigFileTypeRegistrationTest` (5 total) | ✅ | ✅ green 5; rendered highlighting UAT #3, #4 |
| 84-05-03 | 05 | 3 | CFG-02 (D-02, D-06, D-07, D-14, D-16) | — | `BbjConfigFileTypeOverrider` delegates entirely to `isConfigFile` (no filesystem, content or proxy work); `update()` calls `reparseFiles` exactly once inside `invokeLater` when the active path changed; QA rows 10–12 added | source-guard + manual | G `config.BbjConfigFileTypeOverriderSourceGuardTest` (5); `QA/FULL-TEST-CHECKLIST.md` IntelliJ rows 10–12 | ✅ | ✅ green 5; live flip UAT #3, #4, #5 |
| 84-06-01 | 06 | 3 | CFG-01 (D-03, D-12) | — | `getConfigPath()`/`getConfigPathArg()` read `activeConfigPath()`; `ConfigPaths.configPathArg` refuses sentinel/null/empty; no BBj-home join anywhere in the action classes | unit + source-guard | G `actions.BbjRunActionConfigPathTest` (4), `actions.BbjRunActionConfigPathSourceGuardTest` (`baseClassAccessorsEachCallActiveConfigPathExactlyOnce`, `noActionSourceJoinsABbjHomeConfigPathDefault`) | ✅ | ✅ green |
| 84-06-02 | 06 | 3 | CFG-01 (D-03) | — | GUI run adds `-c` only inside the null guard; BUI/DWC abort with a named notification when the path is blank via the shared `buildWebRunCommandLine` (WR-02) | source-guard | G `BbjRunActionConfigPathSourceGuardTest` (5 total); re-scoped `actions.EmTokenTrustWindowSourceGuardTest` (8), `lsp.BbjSecretArgvSourceGuardTest` (23) | ✅ | ✅ green; live argv UAT #7 (GUI in both IDEs; BUI/DWC not exercised) |
| 84-06-03 | 06 | 3 | CFG-01 (D-11, D-15) | — | `BbjSettingsLookups.lookupConfig`: tilde expansion before the absolute decision, `failed` on a throwing probe, win32 drive-letter rule; `ComponentValidator` on the config path field is warning-only, shares the single `AlarmScheduler`, does no inline filesystem work; Apply untouched | unit + source-guard | G `BbjSettingsLookupsConfigPathTest` (12), `lsp.BbjSettingsComponentSourceGuardTest` (7) | ✅ | ✅ green 12 + 7; rendered warning + Apply UAT #8 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Code-review fixes landed after the plans (84-REVIEW-FIX.md) and their pinning tests: CR-01 stale-association race (`90a2822e`) → `config-file-association.test.ts` push-releases-old-path case; CR-02 Windows separator mismatch (`07b7656f`) → `ConfigPathsTest#samePathNormalizesBackslashes…`; IN-04 platform-gated separator normalization (`8e78155d`) → `ConfigPathsTest#samePathDoesNotNormalizeSeparatorsOnLinux…`; WR-02 shared web-run helper (`6a55b854`) → `BbjRunActionConfigPathSourceGuardTest` two helper cases; IN-03 (`09c37f16`) → `BbjConfigFileTypeRegistrationTest` still green. WR-01 (`2c142311`, per-keystroke listener removed) is unpinned: a re-added `onDidChangeTextDocument` association trigger would not fail any test — recorded as an accepted residual (the explanatory comment at the removal site in `extension.ts` is the guard).

Requirement coverage (re-run 2026-09-06: phase-84 vitest files 68/68, companion files 104/104; whole IntelliJ module `--rerun` 67 suites, 565 tests, 0 failures, 0 errors, 0 skipped — before the Validation Audit additions below):

| Requirement | Covering tests | Gap type |
|-------------|----------------|----------|
| CFG-01 — the configured config file is honored by every consumer (PREFIX, run, compile, Show-config) in both IDEs | VS Code: `config-path-resolution` (29), `config-path-consumers` (19), `compile-request` (13), `command-argv-injection` (25), `run-call-file-resolution` (6), `compiler-options*` (53), package.json script. IntelliJ: `ConfigPathsTest` (18), `ConfigModelsJsonBoundaryTest` (2), `BbjConfigPathServiceSourceGuardTest` (5), `ComposerRequestContractTest` (4), `ComposerFlowTest` (14), `BbjRunActionConfigPathTest` (4), `BbjRunActionConfigPathSourceGuardTest` (5), `BbjSettingsLookupsConfigPathTest` (12), `BbjSettingsComponentSourceGuardTest` (7), `Lsp4ijOverrideSiteSourceGuardTest` (7) | COVERED (live process argv, BUI/DWC abort notification, IntelliJ balloon and Settings validator rendering are manual; see Manual-Only) |
| CFG-02 — the configured file is treated as a config file (highlighting, composer, tooling) regardless of filename in both IDEs | VS Code: `config-path-resolution` (resolver + PREFIX through the resolver), `config-file-association` (20), `extension-activation` (2). IntelliJ: `ConfigPathsTest` predicates, `BbjConfigPathServiceSourceGuardTest`, `BbjConfigFileTypeRegistrationTest` (5), `BbjConfigFileTypeOverriderSourceGuardTest` (5) | COVERED at the mock/source-guard boundary (editor rendering, reopen/revert survival and the live file-type flip are manual; see Manual-Only) |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 stubs were needed: every task wrote its failing test first against the existing Vitest and JUnit 5 runners (RED observed in each SUMMARY, mostly as compile or import failures against not-yet-existing seams). No new fixture, dependency or platform test framework was added.

---

## Manual-Only Verifications

All items below were confirmed in live IDEs during `/gsd-verify-work 84` on 2026-09-06 (84-UAT.md: 8 passed, 0 issues). They remain manual because TextMate rendering, the document lifecycle, LSP4IJ's server start, IntelliJ's notification platform, `ComponentValidator` and a real `bbj` process all need a running IDE, which both test modules deliberately exclude.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| VS Code custom-named config file keeps bbx-config highlighting and the SETOPTS CodeLens across close/reopen and Revert File | CFG-02 | Real document lifecycle + TextMate rendering; the per-keystroke belt was removed by WR-01 so reopen semantics carry this | QA VS Code row 10 (UAT #1) |
| VS Code SETOPTS composer hint names the active file's full path when the home default is open | CFG-02 | Rendered message + live webview. Note: fires only on the Command Palette entry; CodeLens/Code Action pass an argument and skip the hint (accepted, matches QA row 11 wording) | QA VS Code row 11 (UAT #2) |
| IntelliJ custom-named config file shows the gear icon and bbx highlighting and never reaches the language server | CFG-02 | Icon/grammar rendering; proving the file is not mapped needs the LSP4IJ runtime (check the Language Servers tool window) | QA IntelliJ row 10 (UAT #3) |
| IntelliJ home default config.bbx opens as a config file, not BBj source | CFG-02 | Same | QA IntelliJ row 11 (UAT #4) |
| IntelliJ setting change flips the file type of both open files without an IDE restart | CFG-02 | `reparseFiles` inside `invokeLater` needs a live IDE; the server must be running (a BBj file open) for the push to arrive | QA IntelliJ row 12 (UAT #5) |
| IntelliJ missing/unreadable config file balloon naming the exact path, once per path per session | CFG-01 | Notification platform | Set a non-existent absolute path, Apply, re-apply (UAT #6; no QA row yet) |
| GUI/BUI/DWC run and web run receive the resolved path as `-c`, never the raw setting, a derived default or the sentinel | CFG-01 | Real `bbj` process launch (`Commands.cjs` unmockable) | `ps -ef \| grep -- '-c/Users'` while running (UAT #7, GUI in both IDEs; BUI/DWC still to be exercised; no QA row yet) |
| IntelliJ Settings inline warning for a relative or missing config path; Apply still succeeds | CFG-01 | `ComponentValidator` rendering in a live dialog | Type a relative path, then a missing absolute path (UAT #8; no QA row yet) |
| VS Code missing config file warning naming the path, once per path per session | CFG-01 | Notification rendering (the once-per-path logic itself is now automated, see Validation Audit) | Set `bbj.configPath` to a non-existent absolute path; reload; re-save the same setting (not in UAT round 1 — add a QA row) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none)
- [x] No watch-mode flags (one-shot vitest and Gradle only)
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-06 (reconstructed; all task commands re-run green after UAT completed 8/8)

## Validation Audit 2026-09-06
| Metric | Count |
|--------|-------|
| Gaps found | 4 |
| Resolved | 2 |
| Escalated | 2 (accepted as backstop / manual by design) |

Gap detail:

1. VS Code missing-config-file `showWarningMessage` once per distinct path (84-02-01, D-13) — was unasserted and not in UAT. **Resolved:** `config-file-association.test.ts` › `missing config file warning` (4 tests: warns once naming the path; identical push does not repeat; a different missing path warns again; an existing file never warns). File now 24/24 green.
2. VS Code `samePath` win32/darwin case-fold (84-01-01, D-04) — the vitest case returns early on Linux; the TS `samePath` has no injectable OS. Declared a backstop in the plan; the IntelliJ mirror asserts the rule for real via its injectable OS name. Accepted as backstop.
3. Revert-File survival (84-02-02) — automated trigger deliberately removed by review fix WR-01; proven by UAT #1. Manual by design.
4. IntelliJ `bbj/resolvedConfigPath` notification handler body (84-04-03, D-13) — cache write outside `invokeLater`, balloon inside it, early return when the file exists, `shouldWarnOnce` gate — had no source guard; balloon behavior proven by UAT #6. **Resolved:** new `lsp/BbjLanguageClientResolvedConfigPathSourceGuardTest` (5 tests: single annotated handler; cache update precedes `invokeLater`; `createNotification` only inside the lambda; `shouldWarnOnce` exactly once before deferral; early return on `result.exists`). 5/5 green.
