# Phase 01 Plan 01: Gradle Project Skeleton Summary

**One-liner:** Created buildable IntelliJ plugin project with Gradle 8.13, IntelliJ Platform Gradle Plugin 2.11.0, and minimal plugin descriptor targeting Community Edition 2024.2+.

---

**Subsystem:** build-infrastructure
**Tags:** gradle, intellij-platform-sdk, plugin-scaffolding, build-system
**Phase:** 01-plugin-scaffolding
**Plan:** 01

**Requires:**
- None (first plan in project)

**Provides:**
- Gradle build infrastructure with IntelliJ Platform SDK 2024.2
- Minimal plugin descriptor (com.basis.bbj.intellij)
- Gradle wrapper for reproducible builds
- Foundation for Java source files in Plan 02

**Affects:**
- 01-02 (file type registration - depends on this build infrastructure)
- Phase 2 (syntax highlighting - depends on plugin structure)
- All future plans (core build system)

**Tech Stack:**

Added:
- IntelliJ Platform Gradle Plugin 2.11.0
- Gradle 8.13
- IntelliJ IDEA Community 2024.2 SDK
- Java 17 target compatibility

Patterns:
- Gradle Kotlin DSL for build configuration
- IntelliJ Platform dependencies via intellijPlatform {} block
- Plugin descriptor in META-INF/plugin.xml

**Key Files:**

Created:
- bbj-intellij/build.gradle.kts (Gradle build configuration)
- bbj-intellij/settings.gradle.kts (Gradle settings with platform plugin)
- bbj-intellij/gradle.properties (JVM memory configuration)
- bbj-intellij/gradlew (Gradle wrapper Unix script)
- bbj-intellij/gradlew.bat (Gradle wrapper Windows script)
- bbj-intellij/gradle/wrapper/gradle-wrapper.jar (Gradle wrapper binary)
- bbj-intellij/gradle/wrapper/gradle-wrapper.properties (Gradle 8.13 distribution config)
- bbj-intellij/src/main/resources/META-INF/plugin.xml (minimal plugin descriptor)

Modified:
- None

**Key Decisions:**

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Gradle 8.13 instead of 8.12 | IntelliJ Platform Gradle Plugin 2.11.0 requires Gradle 8.13+ | Ensures compatibility with latest plugin tooling |
| IntelliJ Platform Gradle Plugin 2.11.0 | Latest stable version with modern DSL and Community Edition support | Future-proof build configuration |
| Kotlin DSL (build.gradle.kts) | Type-safe, modern standard for Gradle builds | Better IDE support and maintainability |
| IntelliJ IDEA Community 2024.2 | Stable version with broad user base, Community Edition compatibility | Targets widest possible user audience |
| Version-less plugin declaration in build.gradle.kts | Settings plugin auto-applies platform plugin to avoid version conflicts | Cleaner build configuration |
| No extensions in plugin.xml yet | Plan focuses on build infrastructure only; file types come in Plan 02 | Atomic plan boundaries |

**Duration:** 4 minutes
**Completed:** 2026-02-01

---

## Performance

**Timeline:**
- Started: 2026-02-01T08:42:09Z
- Completed: 2026-02-01T08:46:07Z
- Duration: 3 minutes 58 seconds

**Metrics:**
- Tasks completed: 2/2 (100%)
- Files created: 8
- Files modified: 0
- Commits: 2 (atomic per-task commits)

## What Got Built

### Accomplishments

1. **Gradle Build Infrastructure**: Created complete Gradle project with wrapper, build scripts, and IntelliJ Platform SDK integration
2. **Plugin Descriptor**: Minimal plugin.xml declaring plugin identity (com.basis.bbj.intellij) and platform dependency
3. **Verified Build**: `./gradlew build` completes successfully, producing buildable (empty) plugin
4. **IntelliJ Platform Tasks**: All platform-specific Gradle tasks available (buildPlugin, runIde, patchPluginXml, etc.)

### Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Initialize Gradle wrapper and build scripts | e97c587 | build.gradle.kts, settings.gradle.kts, gradle.properties, gradlew, gradlew.bat, gradle/wrapper/* |
| 2 | Create minimal plugin.xml descriptor | e761084 | src/main/resources/META-INF/plugin.xml |

### Files Created

**Build Configuration:**
- `bbj-intellij/build.gradle.kts` - Kotlin DSL build with IntelliJ Platform Gradle Plugin 2.11.0
- `bbj-intellij/settings.gradle.kts` - Gradle settings with platform settings plugin
- `bbj-intellij/gradle.properties` - JVM memory configuration (-Xmx2048m)

**Gradle Wrapper:**
- `bbj-intellij/gradlew` - Unix wrapper script (executable)
- `bbj-intellij/gradlew.bat` - Windows wrapper script
- `bbj-intellij/gradle/wrapper/gradle-wrapper.jar` - Wrapper binary
- `bbj-intellij/gradle/wrapper/gradle-wrapper.properties` - Gradle 8.13 distribution URL

**Plugin Descriptor:**
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Minimal plugin descriptor (no extensions yet)

### Files Modified

None.

## Decisions Made

### Gradle Version Selection

**Context:** IntelliJ Platform Gradle Plugin 2.11.0 requires Gradle 8.13+ minimum.

**Decision:** Use Gradle 8.13 instead of initially attempted 8.12.

**Alternatives considered:**
- Gradle 8.12 - Rejected (compatibility error)
- System gradle - Not available on build machine

**Rationale:** Plugin requirement dictates minimum version. Using exact minimum (8.13) ensures compatibility without unnecessary bleeding-edge risk.

**Impact:** Build works correctly with latest IntelliJ Platform tooling.

### Plugin Declaration Syntax

**Context:** Settings plugin auto-applies platform plugin, causing version conflict.

**Decision:** Remove version from `id("org.jetbrains.intellij.platform")` in build.gradle.kts, keep version only in settings.gradle.kts.

**Alternatives considered:**
- Declare version in both files - Rejected (conflict error)
- Use legacy plugin approach - Rejected (outdated pattern)

**Rationale:** Settings plugin manages version centrally, build.gradle.kts just uses it.

**Impact:** Clean build configuration following modern Gradle conventions.

### Minimal Plugin Descriptor

**Context:** Plan 01 focuses on build infrastructure only. File type registration happens in Plan 02.

**Decision:** Create plugin.xml with only identity and platform dependency, no `<extensions>` block.

**Alternatives considered:**
- Add file type extensions now - Rejected (requires Java classes from Plan 02)
- Skip plugin.xml entirely - Rejected (build requires it)

**Rationale:** Atomic plan boundaries. This plan establishes build capability; next plan adds functionality.

**Impact:** Build succeeds with empty plugin. Ready for Java source in Plan 02.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Upgraded Gradle from 8.12 to 8.13**

- **Found during:** Task 1 verification
- **Issue:** IntelliJ Platform Gradle Plugin 2.11.0 requires Gradle 8.13+, initial attempt used 8.12
- **Fix:** Updated gradle-wrapper.properties to use Gradle 8.13 distribution URL
- **Files modified:** gradle/wrapper/gradle-wrapper.properties
- **Commit:** Included in e97c587 (Task 1 commit)
- **Rationale:** Build blocker - cannot proceed without compatible Gradle version

**2. [Rule 3 - Blocking] Removed plugin version from build.gradle.kts**

- **Found during:** Task 1 verification
- **Issue:** Settings plugin auto-applies platform plugin, declaring version in both files caused conflict
- **Fix:** Changed `id("org.jetbrains.intellij.platform") version "2.11.0"` to `id("org.jetbrains.intellij.platform")` in build.gradle.kts
- **Files modified:** build.gradle.kts
- **Commit:** Included in e97c587 (Task 1 commit)
- **Rationale:** Build blocker - version conflict prevented task execution

## Issues Encountered

### Gradle Wrapper Bootstrap

**Issue:** System gradle not available on build machine, needed to bootstrap wrapper.

**Resolution:** Copied gradlew scripts from java-interop/, manually created gradle/wrapper directory, downloaded gradle-wrapper.jar from GitHub, and configured gradle-wrapper.properties for Gradle 8.13.

**Impact:** Successfully initialized Gradle wrapper without system gradle dependency.

### IntelliJ Platform Plugin Version Requirement

**Issue:** Build failed with "requires Gradle Gradle 8.13 and higher" using Gradle 8.12.

**Resolution:** Updated wrapper properties to use Gradle 8.13 distribution.

**Impact:** Build succeeded after wrapper re-download.

### Plugin Version Conflict

**Issue:** Build failed with "plugin is already on the classpath with an unknown version" when declaring version in build.gradle.kts.

**Resolution:** Removed version declaration from build.gradle.kts, kept only in settings.gradle.kts.

**Impact:** Build succeeded following modern Gradle plugin application pattern.

## Next Phase Readiness

### Completed Prerequisites

- [x] Gradle build system operational
- [x] IntelliJ Platform SDK 2024.2 resolved
- [x] Plugin descriptor validated
- [x] Build tasks available (buildPlugin, runIde, etc.)

### Ready to Proceed

**Plan 01-02 (File Type Registration)** can now proceed with:
- Gradle build infrastructure in place
- Plugin descriptor ready for `<extensions>` additions
- Java 17 toolchain configured
- IntelliJ Platform SDK available for Language/FileType APIs

### Blockers

None. All success criteria met.

### Recommendations

1. **For Plan 02:** Add BbjLanguage.java, BbjFileType.java, BbjIcons.java, and icon SVG resources
2. **For Plan 02:** Register file type extension in plugin.xml `<extensions>` block
3. **For Phase 2:** Consider TextMate grammar integration approach (LSP semantic tokens vs. bundled grammar)

## Verification

All verification criteria from plan met:

1. ✓ `bbj-intellij/` directory exists at repo root alongside `bbj-vscode/`
2. ✓ `cd bbj-intellij && ./gradlew build --no-daemon` completes with BUILD SUCCESSFUL
3. ✓ `bbj-intellij/src/main/resources/META-INF/plugin.xml` contains valid plugin descriptor
4. ✓ Gradle wrapper files are present and executable

Success criteria:

- ✓ Gradle build completes successfully with IntelliJ Platform SDK resolved
- ✓ plugin.xml is valid and declares correct plugin identity (com.basis.bbj.intellij)
- ✓ Project structure follows IntelliJ plugin conventions (src/main/resources/META-INF/)
- ✓ Ready for Java source files to be added in Plan 02

---

**Status:** ✓ Complete
**Next Plan:** 01-02 (File Type Registration)
