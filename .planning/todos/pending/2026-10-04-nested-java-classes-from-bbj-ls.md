---
created: 2026-10-04
title: Check nested Java classes from bbj-ls getClassInfos (simple-name copy, class tree)
area: java-interop
source: bbj-ls Phase 13 (CMP-02)
files: bbj-vscode/src/language/java-interop-classpath.ts, bbj-vscode/src/language/java-interop-cache.ts
audit_acknowledged:
  milestone: v4.9
  at: 2026-10-05
---

## Problem

bbj-ls now lists public member classes as entries of their own, with `name` the dotted canonical
form (for example `java.util.Map.Entry`), `packageName` the real package (`java.util`) and
`simpleName` the same dotted canonical name. `getClassInfo` answers the dotted name for both the
binary (`java.util.Map$Entry`) and dotted request spellings. `canonicalJavaClassName` (#659,
`java-interop-cache.ts:41-48`) is a no-op for these already-dotted names, so cache keys and
`resolveClass` keep working with no change needed there.

## Observations (read only)

- `loadImplicitImports`' simple-name copy (`java-interop-classpath.ts:141`) does
  `javaClass.name.replace(pack + '.', '')`. For `name: "java.util.Map.Entry"`,
  `pack: "java.util"`, JS `String.replace` with a non-global pattern replaces only the first
  match, giving `simpleName = "Map.Entry"` — not the true simple name `"Entry"`. This pushes a
  second, harmless-but-not-fully-correct copy into the synthetic classpath document, named
  literally `"Map.Entry"`.
- `storeJavaClass` (`java-interop-cache.ts:703`, `java-interop-cache.ts:727`) stores a nested
  class as one flat leaf under its package, not under a two-level `Map` → `Entry` tree. For
  `name: "java.util.Map.Entry"`, `packageName: "java.util"`: `parts = ["java", "util",
  "Map.Entry"]` — the whole simple-name tail is one path segment, never split further on its own
  internal dot. The class tree stores this as a flat sibling of `ArrayList`, `List`, etc.,
  literally named `"Map.Entry"`, not as a child of a `Map` node. This does not break
  `resolveClassByName` (the cache is keyed by the pre-mutation full name, captured before
  `storeJavaClass` runs), but it does mean the object's own `.name` field differs from the cache
  key that retrieves it, and from any "walk into `Map`, find `Entry`" UI navigation.

## What to do

Decide the completion behaviour wanted for nested classes (bare simple name vs. qualified display
name; flat vs. two-level tree), then adjust the simple-name copy and the tree build accordingly.
Verify against a bbj-ls whose `getClassInfos` for `java.util` lists `java.util.Map.Entry`.
