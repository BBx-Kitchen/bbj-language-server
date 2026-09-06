---
phase: 84-config-path-resolution-discoverability-foundation
verified: 2026-09-06T16:35:00Z
status: human_needed
score: 2/4 roadmap truths verified (2 present, behavior-unverified)
behavior_unverified: 2
overrides_applied: 0
behavior_unverified_items:
  - truth: "Opening the configured config file in either IDE shows config-file highlighting, composer affordance, and tooling — not plain-text or BBj-source treatment (roadmap criterion 2)."
    test: "In a running VS Code and a running IntelliJ instance, point bbj.configPath / the IntelliJ config path setting at a custom-named, custom-located file and open it."
    expected: "VS Code: languageId bbx-config, bbx TextMate highlighting, SETOPTS CodeLens visible. IntelliJ: the BBx Config file type's icon, bbx TextMate highlighting via the constant-filename lookup, and no BBj diagnostics/Problems entries."
    why_human: "Rendering an icon, applying a TextMate grammar, and showing a CodeLens are visual outputs; unit tests assert the code that would produce them (setTextDocumentLanguage call, FileTypeOverrider returning the config type, the constant-filename grammar lookup) but do not render an actual editor."
  - truth: "Closing/reopening or reverting that same file preserves the config-file association; it does not silently fall back to a different language on reopen (roadmap criterion 3, guards research Pitfall 5)."
    test: "With the custom config file open and correctly associated, close its tab and reopen it, then edit and use File > Revert File, in both VS Code and IntelliJ (IntelliJ: change the config-path setting while both the old and new file are open, per QA row 12)."
    expected: "The file keeps its config-file treatment (language id / file type) across close+reopen and revert — it does not drop back to bbj or plaintext."
    why_human: "The VS Code test suite simulates reopen by re-invoking the association handler against a mocked vscode module and asserting setTextDocumentLanguage fires again; IntelliJ's re-detection is proven by a source-guard test asserting exactly one reparseFiles call inside invokeLater. Neither exercises VS Code's or IntelliJ's real document-lifecycle machinery, which is the only place Pitfall 5 could actually resurface."
coincidental_reliance_items: []
human_verification:
  - test: "VS Code QA row 10 (FULL-TEST-CHECKLIST.md, VS Code - LSP Features): open a custom-named config file at a custom path, confirm highlighting + SETOPTS CodeLens, close/reopen, then Revert File."
    expected: "Config-file treatment survives all three transitions."
    why_human: "Visual rendering and document-lifecycle behavior; not exercisable outside a running VS Code instance."
  - test: "VS Code QA row 11: with a custom config file configured, open the home default config.bbx and run the SETOPTS composer."
    expected: "A non-blocking message names the active config file's full path before the composer opens on the file actually open."
    why_human: "Message wording and composer-opening behavior in a live webview; the unit test only asserts the underlying function call and argument, not the rendered message or webview."
  - test: "IntelliJ QA row 10: point the config path at a custom-named file, open it, and check the icon, bbx highlighting, and Problems view."
    expected: "Config icon and bbx highlighting appear; no BBj diagnostics are raised on the file."
    why_human: "Icon and grammar rendering, plus confirming the file never reaches the language server, are only observable in a running IDE."
  - test: "IntelliJ QA row 11: with the setting unchanged, open config.bbx from the BBj home cfg directory."
    expected: "The file opens as a config file (config icon, bbx highlighting), not as BBj source."
    why_human: "Same rendering/parsing-boundary observation as above; requires a live IDE."
  - test: "IntelliJ QA row 12: with both the old and new config file open, change the config path setting and check both files' icons/highlighting without an IDE restart."
    expected: "Both file types flip immediately: the old file reverts to extension-based typing, the new file becomes the config file type."
    why_human: "Confirms FileContentUtilCore.reparseFiles + invokeLater actually re-renders both open editors; the source-guard test only proves the call shape, not the live re-render."
  - test: "IntelliJ missing/unreadable config file: configure a non-existent path and observe the once-per-session balloon (84-04's BbjLanguageClient notification handler)."
    expected: "A non-modal balloon names the exact failing path and states no prefixes were loaded; it does not repeat for the same path within the session."
    why_human: "Balloon wording, timing, and dedup-in-practice are UI behaviors; the automated coverage (BbjConfigPathServiceSourceGuardTest, ConfigPathsTest#shouldWarnOnce) proves the dedup key and the invokeLater/project-disposed wiring, not the rendered balloon. No QA-checklist row currently covers this specific case — recommend adding one alongside rows 10-12."
  - test: "GUI/BUI/DWC run actions in both IDEs, launched against a live resolved custom-named config file (84-03's VS Code run paths, 84-06's IntelliJ run actions)."
    expected: "The spawned bbj/bbjcpl process or EM web-run registration receives the resolved config path as -c (or the registered value), never the raw setting, a derived home default, or the EM Config sentinel."
    why_human: "Commands.cjs cannot be exercised end-to-end under Vitest (vi.mock('vscode') never reaches its native require, a pre-existing, documented constraint reconfirmed during this phase); IntelliJ's run actions are similarly only covered by source-guard tests. Actually launching a run and inspecting the spawned argv/EM registration needs a live IDE with BBj installed."
  - test: "IntelliJ Settings dialog: type a relative config path, then a path to a missing file, into the config path field."
    expected: "A non-blocking warning appears inline naming the applicable rule (absolute-path or missing-file); Apply still succeeds in every case."
    why_human: "ComponentValidator rendering in a live Settings dialog; the unit tests (BbjSettingsLookupsConfigPathTest) and source-guard test prove the decision logic and no-second-scheduler wiring, not the rendered warning bubble."
---

# Phase 84: Config Path Resolution & Discoverability Foundation Verification Report

**Phase Goal:** The BBj config file — wherever it lives and whatever it's named — is honored consistently by every consumer of the config path and by the editor's own file-type association, in both IDEs.
**Verified:** 2026-09-06T16:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A user's configured config file — any name, any location — is honored by PREFIX and project-wide USE resolution, run and compile commands, and the SETOPTS composer, in both VS Code and IntelliJ. | ✓ VERIFIED | `resolveConfigPath()` in `config-path-resolver.ts` is the sole derivation site (repo-wide grep confirms it); `bbj-ws-manager.ts` `initializeWorkspace` reads PREFIX through `getResolvedConfigPath()` (directory-scan branch deleted); `Commands.cjs`'s `openConfigFile`/`run`/web-run and `compile-command.ts`'s `readerWithResolvedConfigFile` all read the cache/resolver (verified by reading source, not just tests); IntelliJ's `BbjRunActionBase`, `BbjRunBuiAction`/`DwcAction` mirror this via `BbjConfigPathService.activeConfigPath()`. `argForActiveEditor()` in `setopts-composer-ui.ts` is gated on the `bbx-config` language id, which the association wiring (criterion 2) makes reachable on any custom-named file. 67/67 phase-specific vitest tests pass; whole suite 1219/1219 passed, 0 failed; IntelliJ whole `./gradlew build --offline` BUILD SUCCESSFUL. |
| 2 | Opening that configured file in either IDE shows config-file highlighting, composer affordance, and tooling — not plain-text or BBj-source treatment. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Code is present and wired: VS Code's `applyConfigAssociation` calls `setTextDocumentLanguage(doc, 'bbx-config')` when `isActiveConfigPath` is true; IntelliJ's `BbjConfigFileTypeOverrider.getOverriddenFileType` returns `BbjConfigFileType.INSTANCE` via the same `isConfigFile` predicate, backed by a distinct `BbxConfigLanguage`, its own icon, and `BbxConfigSyntaxHighlighterFactory` resolving the bbx grammar by a constant filename (verified against the platform's actual `TextMateSyntaxHighlighterFactory` behavior). No live editor rendering was exercised in this verification — see human_verification and behavior_unverified_items. |
| 3 | Closing/reopening or reverting that same file preserves the config-file association; it does not silently fall back to a different language on reopen (guards research Pitfall 5). | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Four classification triggers are wired in `extension.ts` (activation sweep, `onDidOpenTextDocument`, `onDidChangeTextDocument`, `onDidChangeConfiguration`) — not a single-shot association, which is exactly the documented Pitfall 5 failure mode; a unit test simulates open+reopen against a mocked `vscode` and asserts `setTextDocumentLanguage` fires both times. IntelliJ re-detection (`FileContentUtilCore.reparseFiles` inside `invokeLater`, triggered from `BbjConfigPathService.update()`) is proven present by a source-guard test. Neither is exercised against real VS Code/IntelliJ document lifecycle machinery. |
| 4 | Both hosts agree on the same resolved path even when only a BBj-home setting (no explicit custom path) is configured, because the fallback logic is exposed from one shared source rather than reimplemented per host. | ✓ VERIFIED | Repo-wide grep confirms the `cfg`+`config.bbx` concatenation exists in exactly one file, `bbj-vscode/src/language/config-path-resolver.ts:196`; every other `cfg`-adjacent string in both `bbj-vscode` and `bbj-intellij` sources is an unrelated `BBj.properties` join or a descriptive comment/placeholder string, not a path derivation. IntelliJ's `BbjConfigPathService`/`ConfigPaths` never derive the home default themselves — pre-answer they use the explicit setting verbatim, matching D-02 — and this is asserted by `ConfigPathsTest`/`BbjConfigPathServiceSourceGuardTest`. |

**Score:** 2/4 truths verified (2 present, behavior-unverified)

### Plan-Level Must-Haves — Automated Coverage Summary

Each plan declared 8-14 detailed `must_haves.truths` in its frontmatter (sentinel neutralization, tilde expansion, relative-path rejection, samePath case-folding, notification dedup, argv sentinel guards, compile `-c` precedence, etc.). All of these were checked against the actual source (not just re-reading the SUMMARY claims) and all resolved to passing:

| Plan | Subsystem | Automated verification re-run | Result |
|------|-----------|-------------------------------|--------|
| 84-01 | Shared resolver + LSP request/notification | `npx vitest run test/config-path-resolution.test.ts` (part of the 3-file run below) | 29/29 pass (re-confirmed); source matches plan's exact resolution-order spec |
| 84-02 | VS Code host cache + dynamic association | `npx vitest run test/config-file-association.test.ts` | pass; 4-trigger wiring confirmed by reading `extension.ts` directly |
| 84-03 | VS Code consumers (Show-config, run, compile) | `npx vitest run test/config-path-consumers.test.ts` | pass; `Commands.cjs`/`process-args.ts`/`compile-command.ts` source read and confirmed to match plan |
| 84-04 | IntelliJ resolved-path channel + predicates | `./gradlew test --offline --tests 'com.basis.bbj.intellij.config.*'` etc. | BUILD SUCCESSFUL; `ConfigModels`/`ConfigPaths`/`BbjConfigPathService` source read and confirmed |
| 84-05 | IntelliJ file type, override, bbx grammar | `./gradlew test --offline --tests 'com.basis.bbj.intellij.config.*'` | BUILD SUCCESSFUL; `plugin.xml` registrations, `BbjConfigFileTypeOverrider`, `BbxConfigSyntaxHighlighterFactory` source read and confirmed |
| 84-06 | IntelliJ run consumers + settings validation | `./gradlew test --offline` (whole suite) | BUILD SUCCESSFUL; `BbjRunActionBase`/`BbjRunBuiAction`/`BbjRunDwcAction`/`BbjSettingsComponent`/`BbjSettingsLookups` source read and confirmed |

Full-suite re-runs performed once each, as required:
- `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` → **1219 passed, 28 skipped, 0 failed** (81 test files passed, 2 skipped).
- `cd bbj-vscode && npx tsc -b tsconfig.json` → clean, no `error TS` lines.
- `cd bbj-intellij && ./gradlew build --offline` → **BUILD SUCCESSFUL** (18 tasks, whole suite including `test`/`check`).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/config-path-resolver.ts` | Single owner of config-path resolution | ✓ VERIFIED | Exports `resolveConfigPath`, `normalizeConfigSetting`, `expandHome`, `canonicalizeConfigPath`, `samePath`, `EM_CONFIG_SENTINEL`; matches plan spec exactly on read |
| `bbj-vscode/src/language/resolved-config-path-request.ts` | `bbj/resolvedConfigPath` request | ✓ VERIFIED | Registered in `main.ts` next to `registerCompileRequest` |
| `bbj-vscode/src/config-path-cache.ts` | VS Code host warm cache | ✓ VERIFIED | Imports `samePath`/`canonicalizeConfigPath` from resolver, no re-derivation |
| `bbj-vscode/src/extension.ts` (modified) | 4-trigger association + notification listener | ✓ VERIFIED | `applyConfigAssociation`/`releaseConfigAssociation`, all 4 triggers + notification handler present |
| `bbj-vscode/src/Commands/Commands.cjs` (modified) | Show-config/run/web-run read cache | ✓ VERIFIED | `getActiveConfigPath`/`stripSentinel` used throughout; no home+cfg+config.bbx concatenation remains |
| `bbj-vscode/src/Commands/process-args.ts` (modified) | Sentinel guards | ✓ VERIFIED | (confirmed via passing `config-path-consumers.test.ts`) |
| `bbj-vscode/src/language/compiler-options.ts` / `compile-command.ts` (modified) | `-c` injection via reader wrapper | ✓ VERIFIED | `readerWithResolvedConfigFile` applied before `lacksExplicitOutputLocation`/`validateOptionsFrom` |
| `bbj-vscode/src/setopts-composer-ui.ts` (modified) | Inactive-config hint | ✓ VERIFIED | `getActiveConfigPath`/`isActiveConfigPath` imported and used in `argForActiveEditor` |
| `bbj-vscode/package.json` (modified) | Setting description + command title | ✓ VERIFIED | Confirmed via direct JSON read: title "Show the Active Config File", description states absolute/tilde/default rules |
| `bbj-intellij/.../config/ConfigModels.java`, `ConfigPaths.java`, `BbjConfigPathService.java` | DTO, pure helpers, warm cache | ✓ VERIFIED | All exist, no `com.intellij` import in `ConfigPaths`, `volatile` cache field confirmed present |
| `bbj-intellij/.../composer/BbjComposerServer.java`, `lsp/BbjLanguageClient.java` (modified) | Request/notification on single proxy interface | ✓ VERIFIED | `ComposerRequestContractTest` passes with the new name on both sides |
| `bbj-intellij/.../BbxConfigLanguage.java`, `BbjConfigFileType.java`, `BbxConfigSyntaxHighlighterFactory.java`, `config/BbjConfigFileTypeOverrider.java` | Plugin-owned config file type + runtime override | ✓ VERIFIED | `plugin.xml` shows exactly one new `<fileType>`, one `<fileTypeOverrider>`, matching highlighter/editor-provider pair, and exactly one `<languageMapping>` naming BBj |
| `bbj-intellij/.../actions/BbjRunActionBase.java`, `BbjRunBuiAction.java`, `BbjRunDwcAction.java`, `BbjSettingsComponent.java`, `BbjSettingsLookups.java` (modified) | Cache-backed run consumers + inline validation | ✓ VERIFIED | `getConfigPath()`/`getConfigPathArg()` delegate to `activeConfigPath()`; blank-check guards present in BUI/DWC; `ConfigLookup`/`lookupConfig` present |
| `QA/FULL-TEST-CHECKLIST.md` (modified) | Manual QA rows for live-IDE behaviors | ✓ VERIFIED (present, unchecked) | Rows 10-11 (VS Code) and 10-12 (IntelliJ) added, all correctly left unchecked `[ ]` — honest reporting, not a false pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `main.ts` | `resolved-config-path-request.ts` | `registerResolvedConfigPathRequest(connection, …)` call | ✓ WIRED | Present immediately after `registerCompileRequest` |
| `bbj-ws-manager.ts` `initializeWorkspace` | `config-path-resolver.ts` | `this.getResolvedConfigPath()` | ✓ WIRED | PREFIX read routed through it; dead directory-scan branch deleted |
| `main.ts` `setConfigPath` (both branches) | `bbj-notifications.ts` | `notifyResolvedConfigPath(wsManager.getResolvedConfigPath())` | ✓ WIRED | 3 call sites total in `main.ts` (1 build-phase + 2 setConfigPath branches) confirmed by grep |
| `extension.ts` | `config-path-cache.ts` | `client.onNotification(RESOLVED_CONFIG_PATH_METHOD, …)` | ✓ WIRED | Registered beside `bbj/bbjcplAvailability` |
| `Commands.cjs` | `config-path-cache.ts` | `require("../config-path-cache")` | ✓ WIRED | `getActiveConfigPath`/`getResolvedConfigPath` used throughout |
| `compile-command.ts` | `compiler-options.ts` | `readerWithResolvedConfigFile(rawRead, deps.wsManager.getResolvedConfigPath().path)` | ✓ WIRED | Applied before validation, confirmed by source read |
| `BbjComposerServer.java` | language server | `@JsonRequest("bbj/resolvedConfigPath")` | ✓ WIRED | `ComposerRequestContractTest` passes, cross-checks against TS source |
| `BbjConfigFileTypeOverrider.java` | `BbjConfigPathService.java` | `isConfigFile(VirtualFile)` | ✓ WIRED | Sole decision point, confirmed by source-guard test + direct read |
| `BbjRunActionBase.java`/`BbjRunBuiAction`/`BbjRunDwcAction` | `BbjConfigPathService.java` | `activeConfigPath()`/`getConfigPath()` | ✓ WIRED | Confirmed by direct source read; no BBj-home join remains |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CFG-01 | 84-01, 84-03, 84-04, 84-06 | Configured config file honored by every consumer of the config path (PREFIX/USE, run/compile, composer), both IDEs (#485) | ✓ SATISFIED | Structural + automated evidence above; run-command end-to-end behavior remains human-verification (see human_verification) |
| CFG-02 | 84-01, 84-02, 84-04, 84-05 | Configured config file treated as config file (highlighting, composer, tooling) regardless of filename, both IDEs (#485) | ✓ SATISFIED (structurally); visual rendering unverified | Wiring/predicates fully present; live-editor rendering is the human_needed surface |

No orphaned requirements: REQUIREMENTS.md maps only CFG-01 and CFG-02 to Phase 84 (`| CFG-01 | Phase 84 | Complete |`, `| CFG-02 | Phase 84 | Complete |`); CFG-03 is correctly scoped to Phase 85 and out of this phase's boundary per `84-CONTEXT.md`.

### Anti-Patterns Found

None introduced by this phase. A repo-wide + phase-file-scoped grep for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` across every file this phase's six plans modified found two pre-existing `TODO` comments in `bbj-ws-manager.ts` (lines 15 and 265); `git log -L` on both lines traces them to commits `477f0b6e` and `c757a8d6`, unrelated pre-phase-84 work — not new debt. A grep for planning identifiers (`D-NN`, `CFG-0N`, `84-0N`) across every file this phase created or modified found none in phase-84 additions; the only `D-12` hits are in `BbjSettingsComponent.java`/`BbjSettingsLookups.java`, traced via `git log -L` to phase-79 commits (`91e0d7b8`, `cf148801`) — an unrelated, coincidentally-numbered decision from an earlier phase, not a Phase 84 hygiene violation.

### Behavioral Spot-Checks / Probe Execution

Full-suite runs (not filtered per-truth) executed once each:
- VS Code: `npx vitest run --maxWorkers=2` (RUN_BBJ_TESTS=0) → 1219 passed, 28 skipped, 0 failed, 81 files passed / 2 skipped.
- VS Code: `npx tsc -b tsconfig.json` → clean.
- IntelliJ: `./gradlew build --offline` → BUILD SUCCESSFUL (includes `test` and `check`).

No probe scripts (`scripts/*/tests/probe-*.sh`) are declared by or relevant to this phase — skipped.

### Human Verification Required

See `human_verification` in the frontmatter for full detail. Summary:

1. **VS Code custom-named config file — reopen/revert survival** (QA row 10). Requires a live VS Code window.
2. **VS Code inactive-config hint in the SETOPTS composer** (QA row 11). Requires a live VS Code window.
3. **IntelliJ custom-named config highlighting + no BBj diagnostics** (QA row 10). Requires a live IntelliJ instance.
4. **IntelliJ config.bbx reclassified away from BBj source** (QA row 11). Requires a live IntelliJ instance.
5. **IntelliJ live config-path change flips file type on both files without restart** (QA row 12). Requires a live IntelliJ instance.
6. **IntelliJ missing-config-file balloon** — dedup and wording. No QA-checklist row currently exists for this specific case; recommend the human tester add and check one alongside rows 10-12.
7. **GUI/BUI/DWC run actions in both IDEs**, launched live against a resolved custom-named config file. `Commands.cjs` and the IntelliJ run actions are only covered by source-guard tests (a documented, pre-existing constraint — `vi.mock('vscode')` cannot reach `Commands.cjs`'s native `require`), not by an end-to-end launch. No QA-checklist row currently exists for this.
8. **IntelliJ Settings dialog inline validator rendering** for a relative or missing config path, confirming Apply still succeeds. No QA-checklist row currently exists for this.

### Gaps Summary

No gaps. Every must-have that could be verified by static analysis, automated test, or full-repo grep passed on direct inspection of the actual source — not merely on the SUMMARY.md narrative. The two roadmap criteria that inherently require a running IDE (config-file highlighting/composer affordance, and its survival across reopen/revert) are structurally wired and unit-tested at the mock boundary, but their real-editor behavior has not been exercised by anyone yet, human or automated — the phase's own SUMMARY.md files are candid about this (`human_judgment: true` on the corresponding coverage entries) and five of the eight items already have QA-checklist rows recorded and left unchecked, which this verification treats as honest, not evasive, reporting. Three additional live-IDE items (the IntelliJ missing-file balloon, the GUI/BUI/DWC run launch, and the IntelliJ Settings dialog validator rendering) are equally well-covered by unit/source-guard tests but currently lack a QA-checklist row; recommend adding rows for these before end-of-phase UAT closes out.

---

_Verified: 2026-09-06T16:35:00Z_
_Verifier: Claude (gsd-verifier)_
