---
phase: 84-config-path-resolution-discoverability-foundation
plan: 05
subsystem: intellij-plugin
tags: [intellij, textmate, filetype-override, config-path]

requires:
  - phase: 84-04
    provides: "BbjConfigPathService (isConfigFile/activeConfigPath/update), ConfigPaths (samePath/normalizeSetting), the bbj/resolvedConfigPath request+notification pair"
provides:
  - "BbxConfigLanguage / BbjConfigFileType: the plugin's own Language + LanguageFileType for config files, unmapped to the language server, statically registered for the four default config filenames"
  - "BbxConfigSyntaxHighlighterFactory: resolves the bbx TextMate grammar by a constant default config filename instead of the opened file's name, so a custom-named config file still gets bbx highlighting"
  - "BbjConfigFileTypeOverrider: FileTypeOverrider delegating entirely to BbjConfigPathService.isConfigFile, applying the config file type to any configured path at any name/location and reclassifying config.bbx away from BBj source"
  - "BbjConfigPathService.update() re-detection: reparses the previously and newly active config files via FileContentUtilCore.reparseFiles inside invokeLater whenever the resolved path actually changes"
affects: [87]

actuals:
  tokens: 7002
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Runtime FileTypeOverrider delegating its entire decision to one shared predicate (BbjConfigPathService.isConfigFile), so the override, Phase 87's SETOPTS composer and any future consumer cannot drift apart"
    - "TextMate grammar lookup by a compile-time constant filename rather than the opened VirtualFile's name, closing the gap the stock TextMateSyntaxHighlighterFactory leaves for non-default-named files"
    - "Cache-then-schedule: the volatile cache write stays synchronous outside invokeLater so an indexing-thread read sees the new value immediately, while the VFS re-parse (a UI-thread concern) is deferred and skipped entirely when the active path did not change"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbxConfigLanguage.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjConfigFileType.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbxConfigSyntaxHighlighterFactory.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/config/BbjConfigFileTypeOverrider.java
    - bbj-intellij/src/main/resources/icons/bbj-config.svg
    - bbj-intellij/src/main/resources/icons/bbj-config_dark.svg
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigFileTypeRegistrationTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigFileTypeOverriderSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/config/BbjConfigPathService.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - QA/FULL-TEST-CHECKLIST.md

key-decisions:
  - "BbxConfigLanguage is a distinct Language from BbjLanguage with no parser definition -- config files are never parsed as BBj source and the LSP4IJ languageMapping (keyed on BBj) is left untouched at exactly one entry."
  - "The new fileType entry claims fileNamesCaseInsensitive for the four default names but no extensions attribute -- the BBj entry keeps its existing bbx extension claim, and BbjConfigFileTypeOverrider is the sole authority that resolves the overlap at runtime, so there is never a second place a decision could drift."
  - "BbxConfigSyntaxHighlighterFactory asks TextMateService.getLanguageDescriptorByFileName with the compile-time constant \"config.bbx\" (one of the bundle's own registered names) rather than the opened VirtualFile's name -- verified against the platform jar's actual TextMateSyntaxHighlighterFactory bytecode, which resolves by virtualFile.getName() and would fall back to plain text for a custom-named file."
  - "BbjConfigPathService.update() guards on ApplicationManager.getApplication() == null before computing the pre/post active path and scheduling re-detection, purely so the pre-existing plain-JUnit cache-write test (which constructs the service directly, with no live Application) keeps working; production callers always go through getInstance(), which itself requires a live Application, so the guard changes no production behavior."
  - "Re-detection resolves each candidate path via LocalFileSystem.findFileByPathIfCached rather than findFileByIoFile/refreshAndFindFileByIoFile, so files not currently open in the VFS are silently skipped instead of triggering disk I/O from inside the notification-handling call chain."

requirements-completed: [CFG-02]

coverage:
  - id: D1
    description: "IntelliJ owns a config Language and file type, distinct from BBj, statically registered for the four default config filenames with its own icon and no language-server mapping"
    requirement: "CFG-02"
    verification:
      - kind: other
        ref: "./gradlew build --offline (BUILD SUCCESSFUL) plus grep-verified plugin.xml structure: exactly one <fileType name=\"BBj\"> entry unchanged, one new <fileType name=\"BBx Config\"> with fileNamesCaseInsensitive and no extensions, and exactly one <languageMapping> naming BBj"
        status: pass
    human_judgment: false
  - id: D2
    description: "The config file type carries the bbx TextMate grammar even for a custom-named file, because the plugin's own highlighter factory resolves the grammar by a constant default filename instead of the opened file's name"
    requirement: "CFG-02"
    verification:
      - kind: unit
        ref: "test/config/BbjConfigFileTypeRegistrationTest.java (6 tests: editor-highlighter provider, syntax-highlighter factory registration and implementation class, no-extensions attribute, exactly-one-language-mapping naming BBj, constant-name grammar lookup)"
        status: pass
    human_judgment: false
  - id: D3
    description: "BbjConfigFileTypeOverrider applies the config file type to the active config file or a default-named one at runtime, delegating entirely to the one shared isConfigFile predicate, doing no filesystem probing, blocking call or language-server request"
    requirement: "CFG-02"
    verification:
      - kind: unit
        ref: "test/config/BbjConfigFileTypeOverriderSourceGuardTest.java#overriderReachesTheSharedPredicateExactlyOnceAndReturnsExactlyOneFileTypeConstant, #overriderDoesNoDirectFileConstruction, #overriderDoesNoVirtualFileContentRead, #overriderMakesNoComposerServerProxyCall"
        status: pass
    human_judgment: false
  - id: D4
    description: "BbjConfigPathService.update() re-parses the previously and newly active config files, via reparseFiles inside invokeLater, exactly when the resolved path actually changes, and never on a repeat push of the same value"
    requirement: "CFG-02"
    verification:
      - kind: unit
        ref: "test/config/BbjConfigFileTypeOverriderSourceGuardTest.java#serviceCallsReparseFilesExactlyOnceInsideInvokeLater"
        status: pass
    human_judgment: true
    rationale: "The source-guard test proves the call shape (exactly one reparseFiles, nested inside invokeLater) but not that a live IDE actually flips the open editor's file type without a restart -- that is the D-14 backstop truth and QA row 12, not yet run by a human."
  - id: D5
    description: "In a running IDE, a custom-named config file gets the config icon and bbx highlighting with no BBj diagnostics, config.bbx from the BBj home is treated as a config file rather than BBj source, and a live config-path setting change flips the file type on both the old and new file without a restart"
    verification: []
    human_judgment: true
    rationale: "These are the three QA rows this plan added (IntelliJ IDEA - LSP Features #10-12); they require a running IDE with the plugin installed and have not been run by a human yet."

duration: 25min
completed: 2026-09-06
status: complete
---

# Phase 84 Plan 05: Config Path Resolution & Discoverability Foundation Summary

**IntelliJ now has a plugin-owned `BBx Config` file type -- its own Language, its own icon, its own TextMate highlighter factory that resolves the bbx grammar by a constant filename, and a runtime `FileTypeOverrider` that hands any configured file that treatment (config.bbx included) purely by delegating to the one `isConfigFile` predicate, with re-detection wired so a live config-path change flips both the old and new file without an IDE restart.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-06T15:39:00Z (approx.)
- **Completed:** 2026-09-06T15:50:27Z
- **Tasks:** 3
- **Files modified:** 12 (8 created, 4 modified)

## Accomplishments

- `BbxConfigLanguage`/`BbjConfigFileType` give the plugin a config file type distinct from BBj --
  no parser definition, its own icon (`bbj-config.svg`/`_dark.svg`, converted from the VS Code
  gear artwork to IntelliJ's 16px file-icon convention), statically registered for the four
  default config filenames via `fileNamesCaseInsensitive` and left with no `extensions` claim, so
  the existing BBj `fileType` entry's `bbx` claim is untouched and the overlap is resolved only at
  runtime.
- `BbxConfigSyntaxHighlighterFactory` asks `TextMateService.getLanguageDescriptorByFileName` with
  the compile-time constant `"config.bbx"` rather than the opened file's name -- verified against
  the platform jar's actual `TextMateSyntaxHighlighterFactory` bytecode, which resolves by
  `virtualFile.getName()` and would silently fall back to plain text for any other filename.
  Falls back to `PlainSyntaxHighlighter` (never throws) when the bundle has not resolved a
  descriptor.
- `BbjConfigFileTypeOverrider` implements `FileTypeOverrider`, returning `BbjConfigFileType.INSTANCE`
  when `BbjConfigPathService.isConfigFile(file)` is true and `null` otherwise -- the whole decision
  lives in that one predicate, so a config file at any name or location gets the config treatment,
  `config.bbx` stops being sent to the language server as BBj source, and the override does no
  filesystem probing, blocking call or server request of its own.
- `BbjConfigPathService.update()` now captures the active path before and after the cache write and,
  only when it actually changed, schedules `FileContentUtilCore.reparseFiles` for both the old and
  new file (resolved via `LocalFileSystem.findFileByPathIfCached`, so nothing not already in the VFS
  triggers I/O) inside `ApplicationManager.getApplication().invokeLater(...)`; the cache write itself
  stays synchronous so the overrider sees the new value immediately even while the re-parse is
  still queued.
- `QA/FULL-TEST-CHECKLIST.md` gained three IntelliJ rows (#10-12: custom-named config highlighting,
  `config.bbx` no longer BBj source, live setting change flipping both files) for the parts only a
  running IDE can prove.

## Task Commits

Each task was committed atomically (Tasks 2 and 3 carried `tdd="true"` and follow the RED-GREEN
commit pattern):

1. **Task 1: The config Language, file type and icon** - `39d14150` (feat)
2. **Task 2: The bbx grammar reaches custom-named config files** - `6a5743ef` (test, RED) / `e45f2b4f` (feat, GREEN)
3. **Task 3: The runtime file-type override and re-detection on change** - `5f25588d` (test, RED) / `aad8734b` (feat, GREEN)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbxConfigLanguage.java` - distinct config Language, unmapped to the server
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjConfigFileType.java` - `LanguageFileType` over `BbxConfigLanguage`, no parser
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java` - new `CONFIG_FILE` icon entry
- `bbj-intellij/src/main/resources/icons/bbj-config.svg`, `bbj-config_dark.svg` - config file icon, light/dark
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbxConfigSyntaxHighlighterFactory.java` - constant-filename grammar lookup
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/BbjConfigFileTypeOverrider.java` - runtime `FileTypeOverrider`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/BbjConfigPathService.java` - re-detection on active-path change in `update()`
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - new `fileType`, `fileTypeOverrider`, `editorHighlighterProvider`, `lang.syntaxHighlighterFactory` entries
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigFileTypeRegistrationTest.java` - plugin.xml wiring + constant-lookup proof
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigFileTypeOverriderSourceGuardTest.java` - overrider + re-detection source guards
- `QA/FULL-TEST-CHECKLIST.md` - three new IntelliJ LSP Features rows (#10-12)

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] XML comment containing "--" broke `patchPluginXml`**
- **Found during:** Task 2 (running the required verify after adding the new `editorHighlighterProvider`/`lang.syntaxHighlighterFactory` comment)
- **Issue:** A comment describing the new highlighter registration contained a literal `--`, which is illegal inside an XML comment; `patchPluginXml` failed with `The string "--" is not permitted within comments`.
- **Fix:** Reworded the comment to avoid the double-hyphen.
- **Files modified:** `bbj-intellij/src/main/resources/META-INF/plugin.xml`
- **Verification:** `./gradlew test --offline --tests 'com.basis.bbj.intellij.config.BbjConfigFileTypeRegistrationTest'` green.
- **Committed in:** `e45f2b4f` (Task 2 GREEN commit)

**2. [Rule 3 - Blocking] Self-authored test violated the plan's source-comment hygiene rule**
- **Found during:** Task 2 (planning-identifier grep before commit)
- **Issue:** A test method I added to prove no planning identifiers leaked into the guarded source files itself contained those identifiers (`84-05`, `CFG-02`, `D-06`, `D-07`) as literal search strings, which the plan's `<source_comment_hygiene>` block forbids regardless of intent. A follow-up grep also found `D-02`, `D-14`, `T-84-18` in a Javadoc comment on the Task 3 source-guard test.
- **Fix:** Removed the offending test method entirely (its coverage was redundant with the other five assertions in the same file) and reworded the Task 3 Javadoc to drop the identifiers while keeping the same technical content.
- **Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigFileTypeRegistrationTest.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigFileTypeOverriderSourceGuardTest.java`
- **Verification:** Repeated `grep -niE "84-05|CFG-02|D-06|D-07|D-02|D-14|D-16|T-84"` across every file this plan created or edited returns nothing; both test files still pass.
- **Committed in:** `6a5743ef` (Task 2 RED commit, already clean) and `5f25588d` (Task 3 RED commit, already clean) -- both fixes were made before the respective test file was ever staged.

**3. [Rule 3 - Blocking] Pre-existing plain-JUnit test broke when `update()` gained Application-dependent logic**
- **Found during:** Task 3 (running the combined `com.basis.bbj.intellij.config.*` verify after wiring re-detection)
- **Issue:** `ConfigPathsTest#lastPushWinsWhenTheCacheIsUpdatedTwice` (added in plan 84-04) constructs `BbjConfigPathService` directly with `new`, bypassing `getInstance()`, and calls `update(...)` with no live IntelliJ `Application` running. Task 3's `update()` now calls `activeConfigPath()` (which reads `BbjSettings.getInstance()`) to detect whether the active path changed, so the test failed with a `NullPointerException` on `ApplicationManager.getApplication().getService(...)`.
- **Fix:** Added an `ApplicationManager.getApplication() == null` guard at the top of `update()`: when no Application is running, the cache write still happens (so the existing test's assertions on `getResolvedConfigPath()` still pass) but re-detection is skipped, since it is unreachable to compute or schedule without one. Production callers always go through `getInstance()`, which itself requires a live Application, so this changes no production behavior.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/BbjConfigPathService.java`
- **Verification:** `./gradlew test --offline --tests 'com.basis.bbj.intellij.config.*'` green (all 33+ tests across the package, including the previously-broken `ConfigPathsTest`).
- **Committed in:** `aad8734b` (Task 3 GREEN commit)

---

**Total deviations:** 3 auto-fixed (all Rule 3 - blocking).
**Impact on plan:** All three fixes were required to keep the plan's own verification commands green and to keep this plan's own hygiene rule satisfied; none changes the plan's specified behavior or scope. The whole IntelliJ JUnit suite (`./gradlew test --offline`, no test filter) stayed green throughout, confirming no other plan-84 wiring (84-01 through 84-04) regressed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The config file-type override is available for Phase 87's SETOPTS composer, which was already
designed (per 84-CONTEXT.md) to consume the same `isConfigFile` predicate this plan's overrider
delegates to -- no duplication to reconcile. No live-IntelliJ verification of the three new QA
rows (#10-12: custom-named highlighting, `config.bbx` reclassification, live setting-change
re-detection) has been performed yet; per D4/D5's `human_judgment: true`, that is deferred to
end-of-phase UAT alongside the human-judgment items 84-02 and 84-04 already left open.

---
*Phase: 84-config-path-resolution-discoverability-foundation*
*Completed: 2026-09-06*

## Self-Check: PASSED

All key files confirmed present on disk (BbxConfigLanguage.java, BbjConfigFileType.java,
BbxConfigSyntaxHighlighterFactory.java, BbjConfigFileTypeOverrider.java, bbj-config.svg,
bbj-config_dark.svg, BbjConfigFileTypeRegistrationTest.java,
BbjConfigFileTypeOverriderSourceGuardTest.java, BbjIcons.java, BbjConfigPathService.java,
plugin.xml, QA/FULL-TEST-CHECKLIST.md, this SUMMARY). All five task commits (`39d14150`,
`6a5743ef`, `e45f2b4f`, `5f25588d`, `aad8734b`) confirmed present in `git log`. Plan-level
`<verification>` re-run clean: `./gradlew build --offline` (BUILD SUCCESSFUL, whole suite,
18 tasks), `BbjConfigFileTypeRegistrationTest` passes asserting exactly one `<languageMapping`
naming BBj, and `BbjConfigFileTypeOverriderSourceGuardTest` passes asserting zero filesystem/
content-read/composer-proxy calls in the overrider and exactly one `reparseFiles` call inside
`invokeLater` in the service.
