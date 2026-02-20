---
phase: 06-distribution
plan: 01
subsystem: build
tags: [gradle, intellij-platform, marketplace, packaging]

# Dependency graph
requires:
  - phase: 05-java-interop
    provides: Complete plugin implementation ready for distribution
provides:
  - Marketplace-ready plugin ZIP with bundled language server
  - Plugin metadata (vendor, description, icon)
  - First-launch welcome notification
  - Distributable package installable on any IntelliJ instance
affects: [06-02, 06-03, marketplace-publishing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "prepareSandbox task for runtime file distribution (separate from JAR resources)"
    - "pluginConfiguration block for marketplace metadata (replaces deprecated patchPluginXml)"

key-files:
  created:
    - bbj-intellij/src/main/resources/META-INF/description.html
    - bbj-intellij/src/main/resources/META-INF/pluginIcon.svg
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWelcomeNotification.java
  modified:
    - bbj-intellij/build.gradle.kts
    - bbj-intellij/src/main/resources/META-INF/plugin.xml

key-decisions:
  - "Use pluginConfiguration API over deprecated patchPluginXml for version/description/vendor"
  - "Language server and TextMate grammars in lib/ directory (not JAR embedded) via prepareSandbox"
  - "Welcome notification shows once per installation using PropertiesComponent persistence"

patterns-established:
  - "prepareSandbox copies runtime dependencies to lib/ directory structure"
  - "processResources still copies to JAR resources for classloader fallback in development"
  - "Marketplace metadata in dedicated files (description.html, pluginIcon.svg)"

# Metrics
duration: 5min
completed: 2026-02-01
---

# Phase 6 Plan 01: Plugin Packaging Summary

**Marketplace-ready plugin ZIP with bundled language server at lib/language-server/main.cjs, TextMate grammars, vendor metadata, and first-launch welcome balloon**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-01T19:21:55Z
- **Completed:** 2026-02-01T19:27:07Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- buildPlugin task produces distributable ZIP with correct directory structure
- Language server bundled at lib/language-server/main.cjs (matches BbjLanguageServer.resolveServerPath() expectations)
- TextMate grammars at lib/textmate/bbj-bundle/ for runtime access
- Plugin metadata marketplace-ready: vendor "BASIS International Ltd.", description.html, 40x40 icon
- Welcome notification on first launch directs users to settings configuration

## Task Commits

Each task was committed atomically:

1. **Task 1: Update build.gradle.kts for marketplace-ready packaging** - `945bf92` (feat)
2. **Task 2: Add marketplace metadata files and update plugin.xml** - `aeebfae` (feat)
3. **Task 3: Implement first-launch welcome notification** - `8b61d11` (feat)

## Files Created/Modified
- `bbj-intellij/build.gradle.kts` - Added pluginConfiguration block, prepareSandbox task for lib/ directory structure
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Removed inline metadata (now Gradle-managed), registered postStartupActivity
- `bbj-intellij/src/main/resources/META-INF/description.html` - Marketplace description with features and requirements
- `bbj-intellij/src/main/resources/META-INF/pluginIcon.svg` - 40x40 blue rounded square icon with "BBj" text
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWelcomeNotification.java` - StartupActivity showing settings link on first launch

## Decisions Made

**1. Dual distribution strategy for language server and TextMate bundles**
- `processResources` copies to build/resources/main/ for JAR embedding (development mode classloader fallback)
- `prepareSandbox` copies to lib/ directory for installed plugin (production distribution)
- Rationale: BbjLanguageServer.resolveServerPath() checks plugin.getPluginPath().resolve("lib/...") first, falls back to classloader resource extraction if not found

**2. Migration from patchPluginXml to pluginConfiguration**
- Both APIs valid in IntelliJ Platform Gradle Plugin 2.11.0
- pluginConfiguration is recommended modern approach, subsumes patchPluginXml functionality
- Cleaner vendor metadata structure with nested vendor block

**3. Welcome notification persistence via PropertiesComponent**
- Application-level property "com.basis.bbj.intellij.welcomeShown" ensures single display per IDE installation
- Alternative considered: project-level would show for each project (too noisy)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plugin ZIP ready for local installation testing
- Marketplace metadata complete for future JetBrains Marketplace submission
- Welcome notification guides new users to configuration
- Ready for 06-02: Node.js auto-download capability
- Ready for 06-03: Marketplace submission preparation

**No blockers.** All distribution infrastructure in place.

---
*Phase: 06-distribution*
*Completed: 2026-02-01*
