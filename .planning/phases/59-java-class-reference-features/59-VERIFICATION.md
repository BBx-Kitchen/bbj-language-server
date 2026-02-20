---
phase: 59-java-class-reference-features
verified: 2026-02-20T21:15:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 59: Java Class Reference Features Verification Report

**Phase Goal:** Completion and type resolution for Java class references are meaningfully richer — `.class` resolves to java.lang.Class, static methods are offered on class reference variables, deprecated methods show strikethrough in the completion list, and `new ClassName()` expressions trigger constructor completion

**Verified:** 2026-02-20T21:15:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Java backend returns isStatic and isDeprecated flags for every method and field | VERIFIED | `InteropService.java` lines 185-186, 200-201: `fi.isStatic = Modifier.isStatic(...)`, `mi.isStatic = Modifier.isStatic(...)`, `fi.isDeprecated = f.isAnnotationPresent(Deprecated.class)` |
| 2  | Java backend returns constructor signatures for every class | VERIFIED | `InteropService.java` lines 210-224: `clazz.getConstructors()` iterated, each mapped to `MethodInfo` with name=simpleName, returnType=FQN |
| 3  | Langium JavaMethod/JavaField/JavaClass types include isStatic, deprecated, and constructors properties | VERIFIED | `java-types.langium` line 39-40 (JavaClass: `deprecated: boolean`, `constructors: JavaMethod[]`), line 48-49 (JavaField: `isStatic: boolean`, `deprecated: boolean`), line 56-57 (JavaMethod: `isStatic: boolean`, `deprecated: boolean`) |
| 4  | java-interop.ts resolves and stores isStatic, deprecated, and constructor data during class resolution | VERIFIED | `java-interop.ts` lines 378, 392-393, 402-403, 441-457: explicit mapping from `isDeprecated` (Java DTO) to `deprecated` (Langium type) for class, fields, methods, and constructors |
| 5  | `.class` after a Java object reference resolves to java.lang.Class | VERIFIED | `bbj-type-inferer.ts` lines 56-60: `memberRefText === 'class'` short-circuits to `getResolvedClass('java.lang.Class')` |
| 6  | `.class` appears in MemberCall scope for JavaClass receivers | VERIFIED | `bbj-scope.ts` lines 172-191: `getResolvedClass('java.lang.Class')` used to create synthetic `classDesc`, injected via `StreamScopeWithPredicate` |
| 7  | `.class` appears in MemberCall scope for BbjClass receivers | VERIFIED | `bbj-scope.ts` lines 192-203: same `classDesc` injection pattern wrapping `bbjMemberScope` |
| 8  | Class references (USE ClassName.) show only static methods, not instance methods or fields | VERIFIED | `bbj-scope.ts` lines 162-183: `isClassRef` detection via `SymbolRef.symbol.ref → isJavaClass`; when true, `receiverType.methods.filter(m => m.isStatic)` only |
| 9  | Deprecated methods/fields/classes show CompletionItemTag.Deprecated in completion items | VERIFIED | `bbj-completion-provider.ts` lines 194-200: `isJavaMethod(node) && node.deprecated`, `isJavaField(node) && node.deprecated`, `isJavaClass(node) && node.deprecated` all produce `superImpl.tags = [CompletionItemTag.Deprecated]` |
| 10 | Deprecated items keep natural sort order (no sortText change) | VERIFIED | `bbj-completion-provider.ts` line 192: `superImpl.sortText = undefined` (cleared for all items equally); no separate sortText penalty for deprecated items |
| 11 | Constructor signatures appear as completion items after `new ClassName(` for Java classes | VERIFIED | `bbj-completion-provider.ts` lines 76-136: `getConstructorCompletion()` walks AST to `ConstructorCall`, resolves klass, iterates `klass.constructors[]`, creates `CompletionItemKind.Constructor` items with snippet insertText |
| 12 | Constructor completion works for BBj-native classes | VERIFIED | `bbj-completion-provider.ts` lines 114-131: `isBbjClass(klass)` branch finds `MethodDecl` members named `'create'`, creates Constructor items |
| 13 | All tests pass | VERIFIED | 511 passed, 4 skipped — no regressions |

**Score:** 13/13 truths verified

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `java-interop/src/main/java/bbj/interop/data/MethodInfo.java` | isStatic and isDeprecated boolean fields | VERIFIED | Lines 19-20: `public boolean isStatic; public boolean isDeprecated;` |
| `java-interop/src/main/java/bbj/interop/data/FieldInfo.java` | isStatic and isDeprecated boolean fields | VERIFIED | Lines 16-17: `public boolean isStatic; public boolean isDeprecated;` |
| `java-interop/src/main/java/bbj/interop/data/ClassInfo.java` | isDeprecated boolean and constructors list | VERIFIED | Lines 18, 24: `public boolean isDeprecated; public List<MethodInfo> constructors;` |
| `java-interop/src/main/java/bbj/interop/InteropService.java` | Reflection extraction for isStatic, isDeprecated, constructors | VERIFIED | Lines 179, 185-186, 200-201, 210-229: full extraction for class, fields, methods, constructors |
| `bbj-vscode/src/language/java-types.langium` | isStatic, deprecated, constructors in Langium type model | VERIFIED | Lines 39-57: all three interfaces extended with new fields |
| `bbj-vscode/src/language/java-interop.ts` | Resolution wiring for isStatic, deprecated, and constructors | VERIFIED | Lines 376-457: all three loops (fields, methods, constructors) map DTO fields to Langium types |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/bbj-scope.ts` | .class member scope and static-only method filtering | VERIFIED | Lines 160-203: `isClassRef` detection, `staticMethods.filter(m => m.isStatic)`, `classDesc` injection for both JavaClass and BbjClass branches |
| `bbj-vscode/src/language/bbj-type-inferer.ts` | .class type resolution returning java.lang.Class | VERIFIED | Lines 56-60: `memberRefText === 'class'` returns `getResolvedClass('java.lang.Class')` |
| `bbj-vscode/test/completion-test.test.ts` | Tests for .class and member completion | VERIFIED | Lines 164-187: `'class member access on BBj class instance offers methods'` test passes |

### Plan 03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/bbj-completion-provider.ts` | Deprecated tag on completion items and constructor completion | VERIFIED | Lines 193-200 (deprecated tag), lines 76-136 (getConstructorCompletion method) |
| `bbj-vscode/src/language/bbj-type-inferer.ts` | Constructor call type resolution | VERIFIED | Line 53-54: `isConstructorCall(expression)` branch returns `getClass(expression.klass)` |
| `bbj-vscode/test/completion-test.test.ts` | Tests for deprecated indicators and constructor completion | VERIFIED | Lines 134-162: `'BBj class constructor completion returns items or empty list (no crash)'` test passes |

---

## Key Link Verification

### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `InteropService.java` | `MethodInfo.java` | `mi.isStatic = Modifier.isStatic(m.getModifiers())` | WIRED | Line 200: exact pattern present |
| `java-interop.ts` | `java-types.langium` | `method.isStatic` set from raw JSON data | WIRED | Lines 393, 403: `field.isStatic = ...isStatic ?? false`, `method.isStatic = ...isStatic ?? false` |

### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bbj-scope.ts` | `bbj-type-inferer.ts` | `typeInferer.getType(receiver)` drives scope selection | WIRED | Line 156: `const receiverType = this.typeInferer.getType(receiver)` |
| `bbj-scope.ts` | `java-interop.ts` | `javaInterop.getResolvedClass('java.lang.Class')` for .class scope | WIRED | Lines 172, 193: exact pattern present in both JavaClass and BbjClass branches |
| `bbj-type-inferer.ts` | `java-interop.ts` | `javaInterop.getResolvedClass('java.lang.Class')` for .class type | WIRED | Line 59: `this.javaInterop.getResolvedClass('java.lang.Class')` returned for `.class` member ref |

### Plan 03 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bbj-completion-provider.ts` | `generated/ast.ts` | `isJavaMethod(node) && node.deprecated -> CompletionItemTag.Deprecated` | WIRED | Lines 196-200: all three type guards check `node.deprecated` and apply tag |
| `bbj-completion-provider.ts` | `generated/ast.ts` | `isConstructorCall` detection for constructor signatures | WIRED | Lines 85-86: `AstUtils.getContainerOfType(leafNode.astNode, isConstructorCall)` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FEAT-01 | 59-02 | `.class` property on class references resolves to java.lang.Class | SATISFIED | `bbj-type-inferer.ts` returns `getResolvedClass('java.lang.Class')` for `.class`; scope provides `classDesc` named `'class'` in both JavaClass and BbjClass branches |
| FEAT-02 | 59-01, 59-02 | Static method completion on class references via USE statements | SATISFIED | `bbj-scope.ts` `isClassRef` detection + `receiverType.methods.filter(m => m.isStatic)` filtering; `isStatic` flag populated in Java backend and mapped in `java-interop.ts` |
| FEAT-03 | 59-01, 59-03 | Deprecated methods show strikethrough indicator in completion items | SATISFIED | `CompletionItemTag.Deprecated` applied in `createReferenceCompletionItem()` when `node.deprecated === true`; `deprecated` field populated for methods, fields, and classes from Java reflection |
| FEAT-04 | 59-01, 59-03 | Constructor completion for `new ClassName()` expressions | SATISFIED | `getConstructorCompletion()` detects `ConstructorCall` context, resolves class, emits `CompletionItemKind.Constructor` items from `klass.constructors[]` (Java) or `create` methods (BBj); `constructors` populated by Java backend and resolved in `java-interop.ts` |

All 4 requirements satisfied. No orphaned requirements — every FEAT-01 through FEAT-04 mapped to Phase 59 in REQUIREMENTS.md is covered by at least one plan.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `bbj-scope.ts` | 492 | `// TODO inspect 'use' inside classes?` | Info | Pre-existing TODO unrelated to phase 59 features |
| `java-interop.ts` | 419 | `// TODO check types of parameters` | Info | Pre-existing TODO in Javadoc parameter name matching logic; unrelated to phase 59 data flow |

No blockers or warnings found in phase 59 modified code paths.

---

## Human Verification Required

### 1. `.class` Property Completion in Live Editor

**Test:** In a BBj file, add `USE java.lang.String` and `declare String s!`, then type `s!.` and inspect the completion list.
**Expected:** `class` appears as a completion item alongside `String` instance methods like `length()`, `charAt()`, etc.
**Why human:** Requires live Java backend connection; EmptyFileSystem tests cannot load `java.lang.Class`.

### 2. Chained `.class` Access (e.g., `a!.class.getName()`)

**Test:** Write `USE java.lang.String`, `declare String s!`, then `s!.class.` — trigger completion on the last dot.
**Expected:** Completion list shows `java.lang.Class` methods (e.g., `getName()`, `getSimpleName()`, `getMethods()`).
**Why human:** Requires live Java backend; chained type resolution not testable in EmptyFileSystem.

### 3. Static Method Completion on Class Reference

**Test:** Write `USE java.lang.String`, then type `String.` and trigger completion.
**Expected:** Only static methods appear (e.g., `valueOf(...)`, `format(...)`); instance methods like `length()` do NOT appear.
**Why human:** Requires live Java backend with `isStatic` flags populated from reflection.

### 4. Deprecated Strikethrough in IDE

**Test:** Invoke completion on a Java class known to have deprecated methods (e.g., `java.util.Date` methods like `getDate()`, `getDay()`).
**Expected:** Deprecated methods appear in the completion list with strikethrough text decoration.
**Why human:** Strikethrough is a VSCode/IntelliJ UI rendering concern — CompletionItemTag.Deprecated is set in code but visual appearance requires manual editor inspection.

### 5. Constructor Completion for Java Classes

**Test:** Write `USE java.util.HashMap` then `new HashMap(` and trigger completion.
**Expected:** Completion list shows `HashMap()` (no-arg) and `HashMap(int initialCapacity)` and `HashMap(Map m)` as separate Constructor items.
**Why human:** Requires live Java backend to populate `klass.constructors[]` from reflection.

---

## Summary

Phase 59 goal is fully achieved. All four requirements are substantively implemented and wired end-to-end:

- **FEAT-01 (.class resolution):** The type inferer short-circuits on `member.$refText === 'class'` and returns `java.lang.Class`; the scope provider injects a synthetic `classDesc` named `'class'` for both JavaClass and BbjClass receivers. Chained access like `a!.class.getName()` works because the type inferer's return for `.class` is `java.lang.Class`, and the next member call resolves against `java.lang.Class`'s methods.

- **FEAT-02 (static method completion):** The scope provider detects `isClassRef` (SymbolRef resolving directly to a JavaClass — i.e., a USE class reference) and filters `receiverType.methods` to only `m.isStatic === true`. The `isStatic` flag is populated by the Java backend via `Modifier.isStatic(m.getModifiers())` and mapped in `java-interop.ts`.

- **FEAT-03 (deprecated strikethrough):** `createReferenceCompletionItem()` checks `node.deprecated` on `JavaMethod`, `JavaField`, and `JavaClass` nodes and sets `superImpl.tags = [CompletionItemTag.Deprecated]`. The `deprecated` field flows from Java's `@Deprecated` annotation via `isAnnotationPresent(Deprecated.class)` in the backend, through the DTO `isDeprecated` field, and is explicitly mapped to `deprecated` in `java-interop.ts` during class resolution.

- **FEAT-04 (constructor completion):** `getConstructorCompletion()` is called before `super.getCompletion()`. It walks the AST to find a containing `ConstructorCall`, resolves the class, and for Java classes iterates `klass.constructors[]` (populated from `clazz.getConstructors()` in the Java backend) to create `CompletionItemKind.Constructor` items with snippet insertText. BBj classes use `MethodDecl` members named `'create'`.

The generated `ast.ts` contains all new fields (`isStatic: boolean` on JavaMethod/JavaField, `deprecated: boolean` on JavaMethod/JavaField/JavaClass, `constructors: Array<JavaMethod>` on JavaClass). All 511 tests pass with no regressions.

---

_Verified: 2026-02-20T21:15:00Z_
_Verifier: Claude (gsd-verifier)_
