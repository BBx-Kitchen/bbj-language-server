# Phase 121: Java Interop Service Decomposition - Pattern Map

**Mapped:** 2026-09-29
**Files analyzed:** 12 (5 new collaborator modules + 5 new collaborator unit tests + 2 modified DI/production files, plus the many-file REF-09 fan-out handled as a shared pattern)
**Analogs found:** 12 / 12 (all role-matched within this same codebase; RESEARCH.md itself is the primary source of exact line-number excerpts and is cited directly below rather than re-quoted where it already gives a verified excerpt)

Note: RESEARCH.md (§ REF-12 "Field-and-method-to-collaborator map", § "Protected/Public Member Inventory", § "Cross-Collaborator Couplings", § "clearCache() exact reset order") already contains verified, line-numbered excerpts of exactly what each new module must contain. This file does not repeat those excerpts; it maps each new/modified file to its closest **structural/idiom** analog elsewhere in the tracked codebase — the shape a plan's action section should copy (module header comment, import style, structural-typing of dependencies, DI registration, test harness shape) — which RESEARCH.md does not focus on.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/src/language/java-interop-connection.ts` | service (collaborator) | event-driven (socket lifecycle, breaker state machine) | `bbj-vscode/src/language/java-peer-guard.ts` | role-match |
| `bbj-vscode/src/language/java-interop-cache.ts` (resolution+cache+tree) | service (collaborator) | CRUD (in-memory cache) | `bbj-vscode/src/language/java-class-reload.ts` | role-match |
| `bbj-vscode/src/language/java-interop-lock.ts` | utility (collaborator) | request-response (FIFO queue) | `bbj-vscode/src/language/java-class-refresh.ts` | role-match |
| `bbj-vscode/src/language/java-interop-classpath.ts` | service (collaborator) | request-response (RPC load) | `bbj-vscode/src/language/java-class-reload.ts` | role-match |
| `bbj-vscode/src/language/java-interop-class-index.ts` | service (collaborator) | CRUD (build/query index) | `bbj-vscode/src/language/java-class-reload.ts` | role-match |
| `bbj-vscode/src/language/java-interop.ts` (modified: front class + delegates) | service (DI-registered) | request-response | itself, pre-refactor (1,764 lines) — no better analog; this is the split subject | exact (self) |
| `bbj-vscode/src/language/java-javadoc.ts` (modified: constructor public, `getInstance`/`_instance` removed) | service (DI-registered) | CRUD (lazy file-backed lookup) | `bbj-vscode/src/language/java-interop.ts`'s own DI registration (`JavaInteropService`) is the direct precedent for turning a service into a constructor-injected one | exact |
| `bbj-vscode/src/language/bbj-module.ts` (modified: add `java.JavadocProvider`) | config (DI module) | N/A | itself — `java.JavaInteropService` entry, lines 58-60 (type) / 95-97 (module) | exact |
| `bbj-vscode/src/language/bbj-hover.ts` (modified: take `javadocProvider` from services) | provider | request-response | `bbj-vscode/src/language/bbj-ws-manager.ts:132-134` (`bbjServices.java.JavaInteropService` capture pattern) | exact |
| `bbj-vscode/src/language/bbj-ws-manager.ts` (modified: capture `javadocProvider`, pass into `tryInitializeJavaDoc`) | service | request-response | itself, lines 132-134 (existing `javaInterop` capture) | exact (self) |
| `bbj-vscode/test/java-interop-lock.test.ts`, `java-interop-class-index.test.ts`, `java-interop-cache.test.ts`, `java-interop-classpath.test.ts`, `java-interop-connection.test.ts` (5 new, D-12) | test | CRUD/event-driven per module | `bbj-vscode/test/counting-java-interop.ts` (focused single-collaborator-style test double) + `bbj-vscode/test/java-interop-socket.test.ts` (stub-socket-factory pattern for connection tests) | role-match |
| `bbj-vscode/test/bbj-test-module.ts`, `counting-java-interop.ts`, `fake-interop-peer.ts`, `java-interop-service.test.ts`, `java-interop-socket.test.ts` (modified: delete `isInitialized()` guards, add `java.JavadocProvider` factory) | test fixture | request-response | itself — each file's existing `java.JavaInteropService` factory line is the direct template for the new `java.JavadocProvider` factory line | exact (self) |

## Pattern Assignments

### `bbj-vscode/src/language/java-interop-connection.ts`, `-cache.ts`, `-lock.ts`, `-classpath.ts`, `-class-index.ts` (all five new collaborators)

**Analog:** `bbj-vscode/src/language/java-class-refresh.ts` (91 lines) for the *module-header-comment + structural-typing* idiom; `bbj-vscode/src/language/java-peer-guard.ts` for the *sibling-module-with-no-front-class-import* idiom.

**Module header comment pattern** (`java-class-refresh.ts` lines 1-16, read this session):
```typescript
/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * `bbj/refreshJavaClasses` request handler, plus the shared reload-and-revalidate sequence and
 * the inlay-hint refresh helper it (and the configuration-change handler) use.
 *
 * Extracted from `main.ts` (#563) so this handler body runs in tests without the module-load
 * connection-factory call `main.ts` makes. This module must never import `main.ts` — ...
 */
```
Each new collaborator file should open with the same license header, then a doc comment stating which responsibility it owns (per RESEARCH.md's map) and which extraction issue it comes from (#558 — cite the issue number, not a plan/D-xx id, per the repo's "no planning identifiers in source or test comments" convention already noted in CONTEXT.md's Established Patterns).

**Structural-typing / no-front-class-import pattern** (`java-class-refresh.ts` lines 17-19, 34-39):
```typescript
import type { Connection } from 'vscode-languageserver';
import type { JavaInteropService } from './java-interop.js';
import { reloadClasspathAndRecheckDocuments, type JavaClassReloadServices } from './java-class-reload.js';

/** Structural dependencies {@link createReloadJavaClassesAndRevalidate} needs. */
export interface ReloadJavaClassesDeps {
    javaInterop: Pick<JavaInteropService, 'clearCache'>;
    reloadServices: JavaClassReloadServices;
    refreshInlayHints(): void;
    window: Pick<Connection['window'], 'showInformationMessage'>;
}
```
This is the established repo idiom for a sibling module that needs only a *slice* of another module's public surface via `Pick<...>`, and for accepting behaviour as plain callback functions on an options/deps object rather than importing a concrete class for `instanceof`/subclassing. Apply this same shape for each collaborator's constructor: a `Deps`-style options object (or plain constructor parameters) holding the callbacks RESEARCH.md's "Cross-Collaborator Couplings" table specifies (e.g. Connection needs `createSocket`/`wrapSocket`/`connect` callbacks bound to the front class per D-02; Resolution/cache needs a `resolveClassByName` callback bound to the front class per RESEARCH.md's Hazard 1, not a same-collaborator private method).

**Core pattern — no direct collaborator-to-collaborator import** (`java-peer-guard.ts`, confirmed via RESEARCH.md's Security Domain section: "consumed, not redefined") is a sibling module imported *by* `java-interop.ts` and never imports `java-interop.ts` back. The five new collaborators must follow the same one-directional rule: only `java-interop.ts` (the front class) imports each collaborator file; collaborators never import each other directly — cross-collaborator needs are constructor-injected callbacks or (per RESEARCH.md's Cross-Collaborator Couplings row for Lock) a direct reference to another collaborator **instance** passed in by the front class, never a same-collaborator private call routed around an overridable front-class method (see RESEARCH.md's Hazards 1 and 2 for the two concrete cases this rule prevents from silently breaking `JavaInteropTestService`).

**Error handling pattern:** collaborators reuse `InteropTransportError`/`isInteropTransportFailure` (owned by Connection per D-08's helper-relocation rule in RESEARCH.md) rather than defining new error types. Reference: `java-interop.ts`'s existing catch blocks around `doResolveClassByName` (line 1107) and the parse-lane retry logic — copy the existing try/catch shape verbatim when moving code, do not rewrite it.

---

### `bbj-vscode/src/language/java-javadoc.ts` (constructor public, `getInstance()`/`_instance` deleted)

**Analog:** `bbj-vscode/src/language/java-interop.ts`'s own DI registration is the direct precedent — `JavaInteropService` is already a plain constructor-injected class registered in `bbj-module.ts`, exactly the end state `JavadocProvider` needs to reach.

**Current singleton pattern to remove** (`java-javadoc.ts` lines 17-30, read this session):
```typescript
export class JavadocProvider {

    private static _instance: JavadocProvider;

    private lazyLoad: boolean = false;
    private initialized: boolean = false;
    private packages: Map<string, PackageDoc | URI | null> = new Map();
    private loadPromises: Map<string, Promise<PackageDoc | undefined>> = new Map();
    private fsAccess: FileSystemProvider = new EmptyFileSystemProvider();


    protected constructor(lazyLoad: boolean = true) {
        this.lazyLoad = lazyLoad;
    }
```
Change: `private static _instance` and `static getInstance()` (line 32) are deleted; `protected constructor` becomes `public constructor` (unchanged body/default). `isInitialized()` (public, line 93) stays as-is — it remains the guard `bbj-ws-manager.ts`'s `tryInitializeJavaDoc` and the test factories check before calling `initialize()`.

---

### `bbj-vscode/src/language/bbj-module.ts` (add `java.JavadocProvider`)

**Analog:** itself — the existing `JavaInteropService` entry is the exact template.

**Type declaration pattern** (lines ~55-60, read this session):
```typescript
export type BBjAddedServices = {
    validation: {
        BBjValidator: BBjValidator
    },
    java: {
        JavaInteropService: JavaInteropService
    },
    ...
```
Add `JavadocProvider: JavadocProvider` inside the same `java: {...}` block, and add `import { JavadocProvider } from './java-javadoc.js';` next to the existing `import { JavaInteropService } from './java-interop.js';` line.

**Module registration pattern** (lines ~93-98, read this session):
```typescript
export const BBjModule: Module<BBjServices, PartialLangiumServices & BBjAddedServices> = {
    ...
    java: {
        JavaInteropService: (services) => new JavaInteropService(services)
    },
    ...
};
```
Add `JavadocProvider: () => new JavadocProvider()` (or `(services) => new JavadocProvider()` if a future signature needs services — current constructor takes only `lazyLoad`) inside the same `java: {...}` block.

---

### `bbj-vscode/src/language/bbj-hover.ts`, `bbj-vscode/src/language/bbj-ws-manager.ts` (take `javadocProvider` from services)

**Analog:** `bbj-ws-manager.ts`'s own existing `javaInterop` capture, lines 132-134 (read this session):
```typescript
this.documentFactory = services.workspace.LangiumDocumentFactory;
const bbjServices = services.ServiceRegistry.all.find(service => service.LanguageMetaData.languageId === 'bbj') as BBjServices;
this.javaInterop = bbjServices.java.JavaInteropService;
```
Add `this.javadocProvider = bbjServices.java.JavadocProvider;` on the next line — no new lookup mechanism, this is a direct copy of the existing line's shape with the service name swapped. `bbj-hover.ts`'s field-initializer `protected javadocProvider = JavadocProvider.getInstance();` (line 20) becomes a constructor parameter/assignment taking `services.java.JavadocProvider`, matching however `bbj-hover.ts` already receives its other DI-injected collaborators (check its constructor signature for the existing services-parameter shape before editing).

---

### Five new collaborator unit tests (D-12): `java-interop-lock.test.ts`, `java-interop-class-index.test.ts`, `java-interop-cache.test.ts`, `java-interop-classpath.test.ts`, `java-interop-connection.test.ts`

**Analog:** `bbj-vscode/test/counting-java-interop.ts` (149 lines) for the general "small focused double with a few pinned assertions" shape; `bbj-vscode/test/java-interop-socket.test.ts` (289 lines, `LoopbackInterop`/`newInterop()`) specifically for the **connection** module's stub-socket-factory pattern, since CONTEXT.md's D-12 explicitly asks for "connection: breaker transitions and generation bumps, using a stub socket factory" — this is the existing precedent for exactly that stub shape (`callCreateSocket`/`callConnect`/`callGetRawClass` helper methods exposing protected hooks for direct test invocation).

**Core pattern:** each new test file builds its collaborator directly with plain stub callbacks (no `JavaInteropService`, no DI, no `createBBjTestServices`) per D-12's explicit instruction ("built with stub callbacks and no `JavaInteropService`"). Do not reuse `bbj-test-module.ts`'s heavier `JavaInteropTestService` fixture for these — that fixture is for the *existing* suites that must stay green unmodified in assertions, not for the five new focused tests.

**Naming/no-planning-id convention:** per RESEARCH.md's Established Patterns note and CLAUDE.md's register-check rule (confirmed in user memory), cite the issue number (#558) in comments if needed, never a plan/D-xx identifier.

---

### `bbj-vscode/test/bbj-test-module.ts`, `counting-java-interop.ts`, `fake-interop-peer.ts` (delete `isInitialized()` guard, add `java.JavadocProvider` test-module factory)

**Analog:** each file's own existing `java.JavaInteropService` factory is the direct template for the new `java.JavadocProvider` factory.

**Guard to delete** (`bbj-test-module.ts` lines 65-67, quoted in RESEARCH.md):
```typescript
if (!JavadocProvider.getInstance().isInitialized()) {
    JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider);
}
```
Same shape at `counting-java-interop.ts:106-108` and `fake-interop-peer.ts:91-93` — all three delete identically.

**Factory to add** (in each file's inline `testModule`/`BBjTestModule`/`FakePeerModule`, alongside the existing `java: { JavaInteropService: (services) => new ... }` entry): add `JavadocProvider: () => { const p = new JavadocProvider(); p.initialize([], /* fs provider */); return p; }`, matching D-10's "already initialised with no roots" requirement and RESEARCH.md's A1 assumption about the synchronous-resolution timing of `initialize([], fs)` with empty roots — verify with a positive `isInitialized() === true` check per RESEARCH.md's recommendation rather than trusting timing alone.

**Also needs the same treatment (not named by D-10, flagged by RESEARCH.md's A2):** `bbj-vscode/test/java-interop-service.test.ts` (`MockableJavaInteropService`'s inline `testModule`, lines ~142-162) and `bbj-vscode/test/java-interop-socket.test.ts` (`newInterop()` helper, lines 45-47, which uses plain `createBBjServices` not a test module — needs a direct `services.BBj.java.JavadocProvider.initialize(...)` call instead of a module factory).

---

## Shared Patterns

### DI registration (all REF-09 changes)
**Source:** `bbj-vscode/src/language/bbj-module.ts` lines ~58-60 (type) and ~95-97 (module), the existing `java.JavaInteropService` entries.
**Apply to:** `bbj-module.ts` itself (add `JavadocProvider`), and every test module file that needs an equivalent `java.JavadocProvider` factory override (`bbj-test-module.ts`, `counting-java-interop.ts`, `fake-interop-peer.ts`, `java-interop-service.test.ts`).

### Sibling-module structural typing (all REF-12 collaborators)
**Source:** `bbj-vscode/src/language/java-class-refresh.ts` lines 17-39 (`Pick<JavaInteropService, 'clearCache'>` idiom).
**Apply to:** all five new `java-interop-*.ts` collaborator files — constructor dependencies expressed as narrow structural types or bound callback functions, never a concrete class import used for `instanceof`.

### Front-class-only wiring, no collaborator-to-collaborator imports
**Source:** RESEARCH.md § "Cross-Collaborator Couplings" (verified dependency graph) and § "Two critical override-dispatch hazards".
**Apply to:** all five collaborators — every call that could be intercepted by an existing test-double override (`resolveClassByName`, `ensureCompleteClassIndex`, `createSocket`, `wrapSocket`, `connect`, `getRawClass`, `resolvedClassesCacheLimit`, `buildCompleteClassIndex`, `clearCompleteClassIndex`) must route through a constructor-injected callback bound to the front class's own method, never a direct same-collaborator or sibling-collaborator method call.

### `clearCache()` orchestration order
**Source:** `bbj-vscode/src/language/java-interop.ts` lines 1492-1550 (current implementation), reproduced exactly in RESEARCH.md § "clearCache() exact reset order".
**Apply to:** `java-interop.ts`'s retained `clearCache()` method, which must call each collaborator's `reset()`-shaped method in the documented 6-step order — copy the order verbatim, do not re-derive it.

## No Analog Found

None. Every new/modified file has a same-repo structural analog (all five collaborators pattern off `java-class-refresh.ts`/`java-peer-guard.ts`; the DI/test-fixture changes pattern off the existing `JavaInteropService` registration already present in every file that needs a `JavadocProvider` equivalent).

## Metadata

**Analog search scope:** `bbj-vscode/src/language/` (all `java-*.ts` sibling modules, `bbj-module.ts`, `bbj-hover.ts`, `bbj-ws-manager.ts`), `bbj-vscode/test/` (`bbj-test-module.ts`, `counting-java-interop.ts`, `fake-interop-peer.ts`, `java-interop-*.test.ts`), plus `bbj-vscode/src/language/validations/` checked for the Phase 120 split precedent (confirmed present: `check-classes.ts` plus 7 sibling `check-*.ts`/`class-types.ts` files, consistent with RESEARCH.md's cited "Phase 120 split pattern: modules per responsibility, one entry point that calls them in today's order").
**Files scanned:** 20 (12 read in full or targeted this session, 8 confirmed by `Glob`/`git ls-files`)
**Pattern extraction date:** 2026-09-29
**Tracked-source gate:** every path cited above was confirmed via direct `Read`/`git ls-files` against the working tree at `/home/coder/repos/bbj-language-server`; none are `.gsd`/plugin-mirror paths.
