---
created: 2026-09-20
title: linking.test.ts "Interop related tests" fail even after a targeted class warm-up
area: testing
severity: minor
files:

  - bbj-vscode/test/linking.test.ts:295-452 (Interop related tests)
  - bbj-vscode/test/bbj-test-module.ts (JavaInteropTestService)
---

## Problem

`linking.test.ts`'s `describe.runIf(isInteropRunning)("Interop related tests", ...)` block fails
11 of 42 tests (7 passed, 24 skipped) whenever real java-interop is reachable on `:5008` — the
same baseline documented in the predecessor todo
(`.planning/todos/pending/2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md`)
and re-confirmed identically this session.

Verbatim failure messages (`RUN_BBJ_TESTS=1 npx vitest run test/linking.test.ts -t "Interop"`,
cwd `bbj-vscode`):

- `All BBj classes extends Object` -> `Could not resolve reference to NamedElement named 'toString'. [in 1.bbj:6]`
- `Import and declare simple Java class without using FQNs` -> `Could not resolve reference to JavaPackageLike named 'Date'. [in 3.bbj:2]` + `Could not resolve reference to Class named 'Date'. [in 3.bbj:3]`
- `Import Java class` -> `Could not resolve reference to JavaPackageLike named 'Date'. [in 4.bbj:2]`
- `Declare with direct import` -> `Could not resolve reference to JavaPackageLike named 'Date'. [in 5.bbj:2]`
- `Class definition with direct import in extends` -> `Could not resolve reference to JavaPackageLike named 'Date'. [in 6.bbj:2]`
- `Class definition with direct import in implements` -> `Could not resolve reference to JavaPackageLike named 'List'. [in 7.bbj:2]`
- `Unloaded Java FQN access - test for #6` -> `Could not resolve reference to NamedElement named 'sql'/'Date'/'valueOf'. [in 10.bbj:2]`
- `Java FQN access - test for #6` -> `Could not resolve reference to JavaPackageLike named 'sql'/'Date'` + `NamedElement named 'Boolean'/'TRUE'/'sql'/'Date'/'valueOf'. [in 11.bbj:2-4]`
- `Linked List is resolved` -> `Could not resolve reference to JavaPackageLike named 'LinkedList'. [in 12.bbj:2]`
- `Resolve nested class in use statement` -> `Could not resolve reference to JavaPackageLike named 'Map'/'Entry'. [in 17.bbj:2]`
- `Resolve nested class FQN` -> `Could not resolve reference to JavaPackageLike named 'Map'/'Entry'` + `NamedElement named 'getValue'. [in 18.bbj:3]`

## Investigation this session

Two hypotheses were tested and refuted in sequence, so the next investigator does not repeat them:

1. **Complete-class-index code path (the predecessor todo's own leading hypothesis).** Refuted by
   source inspection: `completeClassIndex`/`hasCompleteClassIndex(` are referenced only inside
   `bbj-vscode/src/language/java-interop.ts` itself, consumed solely by the missing-`use`
   quick-fix helpers (`resolveClassCandidatesBySimpleName`/`findClassCandidatesByPrefix`). Nothing
   in the scope/linking path (`bbj-scope.ts`, `bbj-scope-local.ts`, `bbj-linker.ts`) consults it, so
   a complete class index being present or absent cannot by itself change how `Date`/`List`/`Map`
   resolve.
2. **Live-interop cold-resolution warm-up gap** (this project's own recorded memory,
   `java-interop-cold-resolution-gotcha`) — tested empirically, not just reasoned about. A
   `beforeAll` was added to the `Interop related tests` describe block that called
   `services.BBj.java.JavaInteropService.resolveClassByName('java.util.Map')` and
   `.resolveClassByName('java.util.Map.Entry')` before the failing assertions ran, then the file
   was re-run. Result: **identical 11 failed / 7 passed / 24 skipped** — the warm-up changed
   nothing. The experiment was then reverted; `linking.test.ts` is byte-identical to its pre-session
   state.

**Root cause, confirmed by reading `bbj-vscode/test/bbj-test-module.ts`:** this describe block does
not use real interop at all, regardless of whether `:5008` is reachable. `describe.runIf(isInteropRunning)`
gates on `shouldRunBBjTests()` (a bare TCP probe of `:5008` — see DEBT.md item 5), but the services
under test come from `createBBjTestServices(EmptyFileSystem)`, which injects `JavaInteropTestService`
— a hermetic test double whose `connect()` is hard-coded to `Promise.reject(...)` and whose
`resolveClassByName()` override *never* calls the base class's `resolveClass()`/`storeJavaClass()`
(the methods that actually register a class as resolvable to the scope/linker). The double only
preloads five fake classes in its constructor: `BBjAPI`, `java.util.HashMap`, `java.lang.String`,
`java.lang.Class`, `com.test.SysGui`. Every failing test in the list above references a class
outside that set (`java.util.Date`, `java.util.List`, `java.util.LinkedList`, `java.util.Map`,
`java.util.Map.Entry`, `java.sql.Date`, `java.lang.Boolean`) — those tests cannot pass no matter
what runs on `:5008`, because nothing in this test file ever talks to it. `Object.toString` also
fails because the double's fake `java.lang.Object`-equivalent inheritance chain was never wired for
`toString()`.

This means turning the `isInteropRunning` gate on does not turn on real interop coverage for this
describe block at all — it just exposes tests whose fixture happens to be incomplete. The gate and
the test double are talking past each other.

## Reproduction

```bash
cd bbj-vscode && RUN_BBJ_TESTS=1 npx vitest run test/linking.test.ts -t "Interop"
```

## Not fixed here

DEBT.md item 5 (the `shouldRunBBjTests()` bare-TCP-connect false positive) is a plausible
independent contributor to *why this describe block ever turns on* in an environment with BBj
installed, but it is a separately tracked, pre-existing debt item and was deliberately not touched
by this investigation.

## Fix options for the next investigator

- Preload the missing fake classes (`java.util.Date`, `java.util.List`, `java.util.LinkedList`,
  `java.util.Map` + a nested `Map.Entry`, `java.sql.Date`, `java.lang.Boolean`) into
  `JavaInteropTestService`'s constructor the same way `createHashMapClass`/`createSysGuiClass` do
  today, and wire a minimal `java.lang.Object`-equivalent so `toString()` resolves on any
  user-defined class — the fixture-completeness path.
- Or: make this describe block actually exercise real interop when `isInteropRunning` is true
  (a genuinely live-backed `services` instance, gated the same way `issue447-real-interop.test.ts`
  already does with `NodeFileSystem` + a real `JavaInteropService`), and drop the misleading name
  "Interop related tests" from a fixture that never touches interop otherwise.
