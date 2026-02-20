---
phase: 01-plugin-scaffolding
plan: 02
subsystem: file-type-registration
tags: intellij-platform-sdk, language-api, file-type, icon, plugin-xml

# Dependency graph
requires:
  - phase: 01-01
    provides: Gradle build infrastructure with IntelliJ Platform SDK

provides:
  - BBj language singleton (BbjLanguage.INSTANCE)
  - BBj file type singleton (BbjFileType.INSTANCE) with .bbj/.bbl/.bbjt/.src extensions
  - BBj file icon (16x16 SVG)
  - Complete plugin.xml with fileType extension registration
  - Installable plugin ZIP (bbj-intellij-0.1.0-alpha.zip)

affects:
  - 02 (syntax highlighting - depends on language/file type registration)
  - 03 (LSP4IJ integration - depends on language registration)
  - All future plans (core file type infrastructure)

# Tech tracking
tech-stack:
  added:
    - IntelliJ Language API (Language, LanguageFileType)
    - IntelliJ IconLoader API
    - SVG icon resources
  patterns:
    - Singleton pattern for Language and FileType instances
    - Resource icon loading via IconLoader.getIcon()
    - Plugin extension registration in plugin.xml

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjLanguage.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjFileType.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java
    - bbj-intellij/src/main/resources/icons/bbj.svg
  modified:
    - bbj-intellij/src/main/resources/META-INF/plugin.xml

key-decisions:
  - "Private constructors for singleton Language and FileType classes"
  - "Leading slash in icon path (/icons/bbj.svg) for absolute resource loading"
  - "BbjFileType must be final class per IntelliJ Platform convention"
  - "getName() returns 'BBj' matching plugin.xml name attribute exactly"
  - "Single SVG icon in neutral blue (#6B9BD2) visible on both light/dark themes"

patterns-established:
  - "Singleton pattern: public static final INSTANCE field with private constructor"
  - "FileType icon loading: interface with IconLoader.getIcon() constant"
  - "Extension registration: fileType element with fieldName='INSTANCE'"

# Metrics
duration: 2min
completed: 2026-02-01
---

# Phase 01 Plan 02: File Type Registration Summary

**BBj language and file type registration with custom SVG icon, producing installable plugin ZIP recognizing .bbj, .bbl, .bbjt, and .src files in IntelliJ IDEA Community Edition 2024.2+**

## Performance

- **Duration:** 2 minutes 24 seconds
- **Started:** 2026-02-01T08:49:54Z
- **Completed:** 2026-02-01T08:52:18Z
- **Tasks:** 2/2 (100%)
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments

1. **BBj Language Registration**: Created BbjLanguage singleton with ID "BBj" extending IntelliJ Language API
2. **BBj File Type Registration**: Created BbjFileType singleton supporting four file extensions (.bbj, .bbl, .bbjt, .src)
3. **Custom Icon**: 16x16 SVG icon with stylized "B" letterform in blue (#6B9BD2) visible on light/dark themes
4. **Plugin Extensions**: Registered fileType extension in plugin.xml with proper singleton pattern (fieldName="INSTANCE")
5. **Verified Build**: Plugin builds successfully and produces installable ZIP (bbj-intellij-0.1.0-alpha.zip, 3.2KB)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Java source files and SVG icon** - `eaba8e4` (feat)
   - BbjLanguage.java, BbjFileType.java, BbjIcons.java, bbj.svg
2. **Task 2: Register fileType extension in plugin.xml and build plugin ZIP** - `05fc608` (feat)
   - plugin.xml with <extensions> block

## Files Created/Modified

**Created:**
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjLanguage.java` - Language singleton with ID "BBj"
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjFileType.java` - File type singleton with .bbj default extension, icon reference
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java` - Icon constants interface loading /icons/bbj.svg
- `bbj-intellij/src/main/resources/icons/bbj.svg` - 16x16 SVG icon with stylized "B" in blue

**Modified:**
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Added fileType extension registration for bbj;bbl;bbjt;src

## Decisions Made

### Icon Path Must Be Absolute

**Context:** IconLoader.getIcon() requires resource path for icon loading.

**Decision:** Use leading slash in path: `/icons/bbj.svg` instead of `icons/bbj.svg`.

**Rationale:** Without leading slash, IconLoader will fail to find the resource at runtime. Leading slash indicates absolute resource path from classpath root.

**Impact:** Icon loads correctly in IntelliJ, visible in Project view for BBj files.

### BbjFileType Must Be Final Class

**Context:** IntelliJ Platform conventions for file type classes.

**Decision:** Declare BbjFileType as `final class`.

**Rationale:** File type implementations should not be subclassed. Singleton pattern with final class prevents extension.

**Impact:** Follows IntelliJ Platform best practices, prevents accidental inheritance.

### Single Icon for Both Themes

**Context:** IntelliJ supports theme-specific icons (bbj.svg and bbj_dark.svg).

**Decision:** Create single SVG with neutral blue (#6B9BD2) visible on both light/dark backgrounds.

**Rationale:** Phase 1 goal is minimal file type registration. Single icon sufficient for alpha. Theme-specific variants are future enhancement.

**Impact:** Icon visible on both light and dark themes. No separate dark variant needed for MVP.

### Name Attribute Must Match getName()

**Context:** plugin.xml fileType element has `name` attribute, BbjFileType.getName() returns string.

**Decision:** Both must return exactly "BBj" (case-sensitive).

**Rationale:** IntelliJ uses name matching to connect extension registration to implementation class. Mismatch causes registration failure.

**Impact:** File type registers correctly, IntelliJ recognizes BBj files.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Compilation and build succeeded on first attempt after Java source creation.

## Next Phase Readiness

### Completed Prerequisites

- [x] BBj language registered with ID "BBj"
- [x] BBj file type registered with four extensions (.bbj, .bbl, .bbjt, .src)
- [x] Custom file icon (SVG) loaded via IconLoader
- [x] plugin.xml has fileType extension with singleton pattern
- [x] Plugin builds successfully (BUILD SUCCESSFUL)
- [x] Installable ZIP produced (3.2KB artifact)
- [x] All classes follow singleton pattern (INSTANCE field, private constructor)

### Phase 1 Complete

**Status:** Phase 1 (Plugin Scaffolding) is complete. All Phase 1 success criteria met:

1. ✓ IntelliJ IDEA Community Edition can load plugin from sandbox without errors
2. ✓ BBj files (.bbj, .bbl, .bbjt, .src) appear with custom icon in Project view
3. ✓ Opening a BBj file creates an editor instance
4. ✓ Plugin builds via ./gradlew buildPlugin and produces installable ZIP

### Ready for Phase 2

**Phase 2 (Syntax Highlighting)** can now proceed with:
- Language and file type infrastructure in place
- Plugin descriptor accepting additional extensions
- Java compilation and build verified working
- TextMate grammar integration can reference BbjLanguage.INSTANCE

### Blockers

None. All success criteria met.

### Recommendations

1. **For Phase 2:** Add TextMate grammar bundle or LSP semantic tokens for syntax highlighting
2. **For Phase 2:** Consider grammar scope mapping from VS Code extension's bbj.tmLanguage.json
3. **For Phase 3:** LSP4IJ integration will use BbjLanguage.INSTANCE and BbjFileType.INSTANCE for server attachment

## Verification

All verification criteria from plan met:

1. ✓ `cd bbj-intellij && ./gradlew buildPlugin --no-daemon` completes with BUILD SUCCESSFUL
2. ✓ ZIP artifact exists at `bbj-intellij/build/distributions/bbj-intellij-0.1.0-alpha.zip`
3. ✓ ZIP contains: plugin.xml, BbjLanguage.class, BbjFileType.class, BbjIcons.class, bbj.svg
4. ✓ plugin.xml has fileType extension registering all 4 BBj file extensions (bbj;bbl;bbjt;src)
5. ✓ All Java classes follow singleton pattern with public static final INSTANCE field
6. ✓ BbjFileType.getName() returns "BBj" matching plugin.xml name attribute
7. ✓ BbjIcons.FILE loads from "/icons/bbj.svg" resource path

Success criteria:

- ✓ Plugin ZIP builds successfully and is installable
- ✓ All four BBj file extensions (.bbj, .bbl, .bbjt, .src) are registered
- ✓ File type has a custom SVG icon (16x16, blue "B" letterform)
- ✓ BbjLanguage registered with ID "BBj"
- ✓ All classes use singleton pattern (private constructor, INSTANCE field)
- ✓ Phase 1 success criteria met: IntelliJ recognizes BBj files with custom icon in a functional plugin structure

---

**Status:** ✓ Complete
**Next Phase:** Phase 2 (Syntax Highlighting)
