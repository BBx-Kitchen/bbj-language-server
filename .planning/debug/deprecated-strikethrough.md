---
status: diagnosed
trigger: "Investigate why deprecated methods don't show strikethrough in the completion list"
created: 2026-02-21T12:00:00Z
updated: 2026-02-21T12:30:00Z
---

## Current Focus

hypothesis: The BBj-bundled Java interop service does not send isDeprecated field in MethodInfo/FieldInfo/ClassInfo DTOs, so the TypeScript side always defaults to false
test: Traced the full pipeline from Java backend to completion item
expecting: Confirmed via git history
next_action: Report root cause

## Symptoms

expected: Deprecated methods like getHours() on java.util.Date should show with strikethrough (CompletionItemTag.Deprecated) in completion list
actual: getHours() shows without strikethrough decoration
errors: None (silent failure - deprecated flag defaults to false)
reproduction: Type `.` on a java.util.Date instance and trigger completion
started: Since Phase 59 features were implemented

## Eliminated

- hypothesis: TypeScript deprecated mapping is incorrect
  evidence: java-interop.ts line 402 correctly maps (method as { isDeprecated?: boolean }).isDeprecated ?? false. Code is correct IF isDeprecated is present in JSON.
  timestamp: 2026-02-21T12:10:00Z

- hypothesis: nodeDescription.node is undefined in completion provider
  evidence: createScopeForNodes calls createDescription which always sets node. The spread in enhanceFunctionDescription preserves node from descr.
  timestamp: 2026-02-21T12:15:00Z

- hypothesis: CompletionItemTag.Deprecated is not propagated to final CompletionItem
  evidence: Langium fillCompletionItem (line 566) copies tags from CompletionValueItem to CompletionItem.
  timestamp: 2026-02-21T12:18:00Z

- hypothesis: Timing issue - completion requested before resolveClass finishes
  evidence: resolveClass awaits all method processing before returning. loadImplicitImports awaits resolveClass. Non-implicit classes resolved on-demand via resolveClassByName which also awaits.
  timestamp: 2026-02-21T12:20:00Z

## Evidence

- timestamp: 2026-02-21T12:05:00Z
  checked: Git history of java-interop/src/main/java/bbj/interop/data/MethodInfo.java
  found: isDeprecated field was added in commit a02e009 (Phase 59-01). Before that commit, MethodInfo only had name, returnType, declaringClass, parameters.
  implication: Any Java interop service built before a02e009 does not send isDeprecated

- timestamp: 2026-02-21T12:07:00Z
  checked: Commit 0afed1f "chore: remove JavaInterop part that is now integrated in BBj"
  found: The Java interop was removed from the repo because it was integrated into BBj. The version integrated into BBj did NOT have isDeprecated.
  implication: BBj's bundled Java interop service does not send isDeprecated, isStatic, or constructors

- timestamp: 2026-02-21T12:08:00Z
  checked: Commit 60a3280 "Add java project back" - MethodInfo.java
  found: When re-added, MethodInfo only had name, returnType, declaringClass, parameters (no isDeprecated, no isStatic)
  implication: Confirms the BBj-bundled version lacks these fields

- timestamp: 2026-02-21T12:10:00Z
  checked: java-interop.ts line 402 mapping code
  found: Uses (method as unknown as { isDeprecated?: boolean }).isDeprecated ?? false
  implication: When isDeprecated is absent from JSON, the ?? operator correctly returns false. This is a graceful degradation but means deprecated is never true with old backend.

- timestamp: 2026-02-21T12:25:00Z
  checked: InteropService.java line 201 in current source
  found: mi.isDeprecated = m.isAnnotationPresent(Deprecated.class) - correctly extracts deprecated annotation
  implication: The standalone Java backend in THIS repo correctly sends isDeprecated. The issue is the BBj-bundled version.

## Resolution

root_cause: The BBj-bundled Java interop service (the one the user is running) was built from code that predates commit a02e009, which added isDeprecated to the MethodInfo/FieldInfo/ClassInfo DTOs and the corresponding extraction logic in InteropService.java. When the TypeScript language server receives the JSON-RPC response from the BBj interop service, the isDeprecated field is absent from the method/field/class objects. The mapping code `(method as unknown as { isDeprecated?: boolean }).isDeprecated ?? false` gracefully defaults to false, meaning deprecated is never true and CompletionItemTag.Deprecated is never applied.

fix: The Java interop changes from commit a02e009 (and the full current state of the java-interop directory) need to be integrated into the BBj product's bundled Java interop service.

verification: N/A - requires BBj product update

files_changed: []
