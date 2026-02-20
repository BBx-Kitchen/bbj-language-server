# Phase 59: Java Class Reference Features - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Enrich completion and type resolution for Java class references in BBj. Four capabilities: `.class` resolves to java.lang.Class with chained method access, static methods complete on class references, deprecated items show strikethrough in completion lists, and constructor signatures complete after `new`. No new language constructs — completion provider and type resolution improvements only.

</domain>

<decisions>
## Implementation Decisions

### .class resolution
- Resolve `.class` to raw `java.lang.Class` (no generic type parameter)
- Works on any variable holding a Java object — `a!.class` where `a!` was created via `new java.util.HashMap()`
- Chained access works — `a!.class.getName()` should complete Class methods and return results
- `.class` appears in the completion list when typing `.` on a class reference AND resolves without the current "unresolvable" warning
- Both completion and resolution — not just suppressing the warning

### Static method completion
- Triggers on USE class references (e.g., `USE java.lang.String` then `String.`) AND on `new ClassName` context
- Include inherited static methods from superclasses (e.g., AbstractList statics shown on ArrayList)
- Static methods only — no static fields/constants in completion
- Overloaded static methods shown as separate completion items per overload (each with parameter types visible), not collapsed into one item

### Deprecated indicators
- Strikethrough text only — no additional "(deprecated)" label or tag
- Keep natural alphabetical/relevance order — don't sort deprecated items lower
- Apply to ALL completion contexts: instance methods, static methods, and constructors
- Also apply to deprecated classes (e.g., `java.util.Hashtable`) when they appear in completion — consistent treatment

### Constructor completion
- Triggers during class name typing after `new ` (offer class name completion), then show constructor signatures after `(`
- Separate completion items per constructor overload — consistent with static method approach
- Works for both Java classes (via reflection) and BBj-native classes defined in the project
- Class name completion after `new ` includes all known Java classes from the classpath, not just imported/used ones

### Claude's Discretion
- How to integrate `.class` into the existing type resolution chain
- Implementation of class name completion provider for `new ` context
- How to extract deprecated status from Java reflection data
- Performance considerations for showing all classpath classes after `new `

</decisions>

<specifics>
## Specific Ideas

- `a!.class.getName()` should work end-to-end — the `.class` result is a real java.lang.Class that supports method chaining
- Constructor completion should work the same way whether the class is Java or BBj — consistent experience
- Each overload (static method or constructor) is its own completion item showing parameter types — like IntelliJ/Eclipse behavior

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 59-java-class-reference-features*
*Context gathered: 2026-02-20*
