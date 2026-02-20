---
phase: 59-java-class-reference-features
plan: 01
subsystem: java-interop
tags: [java-reflection, langium-types, type-model, metadata]
dependency_graph:
  requires: []
  provides: [isStatic-field, isDeprecated-field, constructors-field, deprecated-langium-type]
  affects: [java-interop.ts, java-types.langium, InteropService, MethodInfo, FieldInfo, ClassInfo]
tech_stack:
  added: []
  patterns: [Java-reflection-extraction, Langium-interface-extension, DTO-naming-mapping]
key_files:
  created: []
  modified:
    - java-interop/src/main/java/bbj/interop/data/MethodInfo.java
    - java-interop/src/main/java/bbj/interop/data/FieldInfo.java
    - java-interop/src/main/java/bbj/interop/data/ClassInfo.java
    - java-interop/src/main/java/bbj/interop/InteropService.java
    - bbj-vscode/src/language/java-types.langium
    - bbj-vscode/src/language/java-interop.ts
decisions:
  - "Java DTO uses isDeprecated (Java convention) but Langium type uses deprecated — explicit mapping applied in java-interop.ts"
  - "getMethods() preserved over getDeclaredMethods() to include inherited static methods from superclasses"
  - "Constructor resolution uses same JavaMethod type — returnType is the class FQN, name is simpleName"
metrics:
  duration: 3 min
  completed: 2026-02-20
  tasks_completed: 2
  files_modified: 6
---

# Phase 59 Plan 01: Java Backend Metadata Enrichment Summary

Added isStatic, isDeprecated, and constructor reflection data to the Java backend and mapped all new fields into the Langium type model and java-interop.ts resolution pipeline.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add isStatic, isDeprecated, and constructor extraction to Java backend | a02e009 | MethodInfo.java, FieldInfo.java, ClassInfo.java, InteropService.java |
| 2 | Add isStatic, deprecated, and constructors to Langium type model and java-interop.ts resolution | 5c32ab5 | java-types.langium, java-interop.ts |

## What Was Built

### Java Backend (Task 1)

- **MethodInfo.java**: Added `public boolean isStatic` and `public boolean isDeprecated`
- **FieldInfo.java**: Added `public boolean isStatic` and `public boolean isDeprecated`
- **ClassInfo.java**: Added `public boolean isDeprecated` and `public List<MethodInfo> constructors`
- **InteropService.java**: Populated all new fields via reflection in `loadClassInfo()`:
  - Fields: `fi.isStatic = Modifier.isStatic(f.getModifiers())`, `fi.isDeprecated = f.isAnnotationPresent(Deprecated.class)`
  - Methods: `mi.isStatic = Modifier.isStatic(m.getModifiers())`, `mi.isDeprecated = m.isAnnotationPresent(Deprecated.class)`
  - Class: `classInfo.isDeprecated = clazz.isAnnotationPresent(Deprecated.class)`
  - Constructors: `clazz.getConstructors()` mapped to `MethodInfo` list (name=simpleName, returnType=FQN, isStatic=false)
  - Error paths also initialize `constructors = Collections.emptyList()`

### Langium Type Model (Task 2)

- **java-types.langium**:
  - `JavaMethod`: added `isStatic: boolean` and `deprecated: boolean`
  - `JavaField`: added `isStatic: boolean` and `deprecated: boolean`
  - `JavaClass`: added `deprecated: boolean` and `constructors: JavaMethod[]`
- `langium:generate` run — generated `ast.ts` updated with all new fields

### Resolution Wiring (Task 2)

- **java-interop.ts**:
  - `javaClass.constructors ??= []` added early in `resolveClass()` (consistent with `classes ??= []`)
  - `javaClass.deprecated` mapped from raw `isDeprecated` field (Java DTO naming difference)
  - Field loop: `field.deprecated` and `field.isStatic` mapped from raw JSON
  - Method loop: `method.deprecated` and `method.isStatic` mapped from raw JSON
  - New constructor loop: sets `$type`, resolves `resolvedReturnType`, resolves parameter types, calls `linkContentToContainer`
  - `createStubClass()`: initialized with `constructors: []` and `deprecated: false`

## Verification

- Java backend compiles cleanly via javac (Gradle wrapper absent; javac used directly)
- `npm run langium:generate` succeeds — no errors
- `npm run build` succeeds — TypeScript compiles cleanly
- `npm test` — 509 tests pass, 4 skipped (no regressions)
- Generated `ast.ts` contains `isStatic: boolean` on JavaMethod and JavaField
- Generated `ast.ts` contains `deprecated: boolean` on JavaMethod, JavaField, and JavaClass
- Generated `ast.ts` contains `constructors: Array<JavaMethod>` on JavaClass

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Initialize constructors in error paths of loadClassInfo()**
- **Found during:** Task 1
- **Issue:** The two catch blocks for `ClassNotFoundException` and `NoClassDefFoundError` initialized `fields` and `methods` to empty lists but not `constructors`, which would cause NullPointerException when serializing the response
- **Fix:** Added `classInfo.constructors = Collections.emptyList()` to both catch blocks
- **Files modified:** InteropService.java
- **Commit:** a02e009

**2. [Rule 2 - Missing] Initialize constructors and deprecated on stub class in createStubClass()**
- **Found during:** Task 2
- **Issue:** `createStubClass()` creates a minimal JavaClass stub for failed resolutions but did not include the new `constructors` or `deprecated` fields, which are now required by the Langium type model
- **Fix:** Added `constructors: []` and `deprecated: false` to the stub object
- **Files modified:** java-interop.ts
- **Commit:** 5c32ab5

## Self-Check: PASSED

Files confirmed present:
- `java-interop/src/main/java/bbj/interop/data/MethodInfo.java` — contains `isStatic` and `isDeprecated`
- `java-interop/src/main/java/bbj/interop/data/FieldInfo.java` — contains `isStatic` and `isDeprecated`
- `java-interop/src/main/java/bbj/interop/data/ClassInfo.java` — contains `isDeprecated` and `constructors`
- `java-interop/src/main/java/bbj/interop/InteropService.java` — contains `isDeprecated` reflection extraction
- `bbj-vscode/src/language/java-types.langium` — contains `isStatic` on JavaMethod/JavaField
- `bbj-vscode/src/language/java-interop.ts` — contains `isStatic` mapping

Commits confirmed:
- a02e009 (Task 1)
- 5c32ab5 (Task 2)
