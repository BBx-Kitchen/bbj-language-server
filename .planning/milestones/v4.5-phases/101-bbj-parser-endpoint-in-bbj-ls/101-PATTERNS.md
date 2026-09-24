# Phase 101: BBj Parser Endpoint in `bbj-ls` - Pattern Map

**Mapped:** 2026-09-22
**Files analyzed:** 11 (4 modified, 7 new)
**Analogs found:** 11 / 11 (all analogs are the same repository, `/home/coder/repos/bbj-ls`,
not `bbj-language-server` — see phase note below)

**Repository note:** Phase 101 changes zero files in `bbj-language-server`. Every path below
(both "new/modified file" and "analog") lives in the separate Java repository
`/home/coder/repos/bbj-ls` (Maven, Java 21, lsp4j jsonrpc 0.20.1, Guava 33.5.0-jre). All
analog paths were verified tracked with `git -C /home/coder/repos/bbj-ls ls-files`.
`bbj-ls` has **no `src/test` directory today** — for the three new JUnit 5 test files there
is no existing test analog; they follow the DTO/service conventions of `InteropService.java`
plus lsp4j's own `Launcher.Builder` API (already used, non-test, in `LanguageService.java`).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/main/java/bbj/interop/InteropService.java` (modify: add `parseProgram`) | controller (JSON-RPC endpoint) | request-response | itself — `getAllClassNames`/`getClassInfo` methods in the same file | exact |
| `src/main/java/bbj/interop/LanguageService.java` (modify: capture `startListening()` future) | service (connection lifecycle) | event-driven | itself — the `run()` accept loop | exact |
| `pom.xml` (modify: add `ParserServiceAPI` dependency) | config | batch (build) | itself — the existing `BBjStartup` `provided` dependency block | exact |
| `README.md` (modify: add offline install commands) | config/docs | — | itself — existing prose style | exact |
| `src/main/java/bbj/interop/ParserWorker.java` (new) | service (per-connection worker) | event-driven / CRUD-like queue | `InteropService.java`'s `SCAN_CACHE` + `EXECUTOR`-adjacent patterns; `LanguageService.java`'s `EXECUTOR`/`ThreadFactory` | role-match |
| `src/main/java/bbj/interop/BbjPrefixAlgorithm.java` (new) | service (resolution helper) | request-response | `InteropService.java`'s `BbjClassLoader` inner-class style (small, focused helper class colocated in `bbj.interop`) | partial (no existing prefix/resolution analog; nearest structural sibling) |
| `src/main/java/bbj/interop/data/ParseProgramParams.java` (new) | model (DTO) | request-response | `data/ClassInfoParams.java` | exact |
| `src/main/java/bbj/interop/data/ParseProgramResult.java` (new) | model (DTO) | request-response | `data/ClassInfo.java` (extends `WithError`) | exact |
| `src/main/java/bbj/interop/data/ParseError.java` (new) | model (DTO) | request-response | `data/ClassInfo.java` / `data/FieldInfo.java`-style plain-field DTO | exact |
| `src/test/java/bbj/interop/ParseProgramIT.java` (new) | test (integration) | request-response | none in-repo; lsp4j `Launcher.Builder` usage in `LanguageService.java` is the closest style reference | no analog |
| `src/test/java/bbj/interop/MethodNotFoundProbeTest.java` (new) | test (unit, in-process) | request-response | none in-repo; same `Launcher.Builder` reference as above | no analog |
| `src/test/java/bbj/interop/BBjServicesAvailability.java` (new) | test utility (gate/skip helper) | — | none in-repo | no analog |

## Pattern Assignments

### `src/main/java/bbj/interop/InteropService.java` (controller, request-response)

**Analog:** itself (`getAllClassNames`, `getClassInfo`, lines 114-182)

**Imports pattern** (lines 8-54):
```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
...
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;

import com.google.common.base.Stopwatch;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.base.Throwables;

import bbj.interop.data.ClassInfo;
import bbj.interop.data.ClassInfoParams;
```
New file adds `bbj.interop.data.ParseProgramParams`, `bbj.interop.data.ParseProgramResult`
alongside the existing `bbj.interop.data.*` imports; no new external import group beyond
`java.util.ServiceLoader`, `java.util.UUID`, `java.io.ByteArrayInputStream`.

**Bare-name `@JsonRequest` pattern** (lines 114-125, 178-182):
```java
@JsonRequest
public CompletableFuture<List<PackageInfoParams>> getTopLevelPackages() { ... }

@JsonRequest
public CompletableFuture<ClassInfo> getClassInfo(ClassInfoParams params) {
    var classInfo = loadClassInfo(params.className);
    return CompletableFuture.completedFuture(classInfo);
}
```
No `@JsonRequest("name")` string argument is ever used anywhere in this file — lsp4j derives
the RPC name from the Java method name itself. `parseProgram(ParseProgramParams)` must follow
this exact bare-annotation, single-DTO-parameter, `CompletableFuture<T>`-return shape.

**Verbose/system-property flag pattern** (lines 59-60, 78-82) — the model for D-14's
`-Dbbj.interop.*` timeout/size-cap properties:
```java
/** Verbose classpath/package logging, off by default. Enable with -Dbbj.interop.verbose=true. */
private static final boolean VERBOSE = Boolean.getBoolean("bbj.interop.verbose");
...
private static void logVerbose(String message) {
    if (VERBOSE) {
        System.out.println(message);
    }
}
```

**Bounded shared-state cache pattern** (lines 62-73) — the model for any pooled/bounded
server-side state this phase introduces (e.g. the `ParserServiceIF` singleton holder or a
per-connection factory registry, if one is ever needed beyond simple instance fields):
```java
private static final Cache<ClassLoader, ClassPath> SCAN_CACHE = CacheBuilder.newBuilder()
        .weakKeys()
        .expireAfterWrite(10, TimeUnit.MINUTES)
        .build();
```

**Error handling pattern** (lines 84-92, 331-341) — checked exceptions are unwrapped through
Guava `Throwables`, not swallowed silently:
```java
private static ClassPath scanClassPath(ClassLoader loader) throws IOException {
    try {
        return SCAN_CACHE.get(loader, () -> ClassPath.from(loader));
    } catch (ExecutionException e) {
        Throwables.throwIfInstanceOf(e.getCause(), IOException.class);
        Throwables.throwIfUnchecked(e.getCause());
        throw new RuntimeException(e.getCause());
    }
}
```
and a per-request catch that populates a `WithError`-style field rather than throwing (lines
331-341, `loadClassInfo`'s `catch (ClassNotFoundException ...)` block) — for `parseProgram`,
D-12 instead requires the exceptional-completion route (`ResponseErrorException`, see Shared
Patterns below), because the endpoint's failures are JSON-RPC errors, not populated DTO
fields; the `WithError`-populate style is the wrong analog for the D-12 path specifically,
right one for any "expected/degraded" condition if ever needed.

**Per-instance vs. static state distinction** (lines 75-76, 94-101): `InteropService` already
mixes per-connection instance fields (`classLoader`, `classPath`, set in the constructor) with
process-wide static state (`SCAN_CACHE`). The new `ProgramFactoryIF`/`BbjPrefixAlgorithm`/
`ParserWorker` triple (Pattern 1/2/3 from RESEARCH.md) is per-connection instance state,
constructed in `InteropService`'s constructor exactly like `classLoader` is today (lines
94-101); `ParserServiceIF` itself (obtained once via `ServiceLoader`) is process-wide static
state, following the `SCAN_CACHE` model.

---

### `src/main/java/bbj/interop/LanguageService.java` (service, event-driven)

**Analog:** itself, the accept loop and connection setup (lines 84-99)

**Connection setup — where the per-connection worker must be constructed and torn down**:
```java
var interopService = new InteropService();
var launcher = new Launcher.Builder<>().setLocalService(interopService)
.setRemoteInterface(LanguageServer.class)
.setInput(Channels.newInputStream(connection))
.setOutput(Channels.newOutputStream(connection)).setExecutorService(EXECUTOR).create();
launcher.startListening();
```
**Gap this phase must close (confirmed in RESEARCH.md §8):** `launcher.startListening()`'s
returned `Future<Void>` is discarded today — nothing observes connection close. The modify
adds capturing that future and wiring a completion callback that shuts down
`interopService`'s `ParserWorker`, e.g.:
```java
Future<Void> listening = launcher.startListening();
CompletableFuture.runAsync(() -> {
    try { listening.get(); } catch (Exception ignored) { }
}, EXECUTOR).whenComplete((r, t) -> interopService.shutdownParserWorker());
```
(Illustrative — exact mechanism is plan-time discretion; the load-bearing fact from the
analog is that `EXECUTOR` and the existing `Launcher.Builder` call are the only two things to
extend, not replace.)

**Logging pattern** (lines 27, 85-95, 105-107) — `java.util.logging`, not `System.out`, is
the convention for anything server-lifecycle-level (D-12's WARNING-level, no-stack-trace
failure log belongs here, not in `InteropService`'s `System.out` style):
```java
private static final Logger LOG = Logger.getLogger(LanguageService.class.getName());
...
LOG.log(Level.INFO, "BBj Language Service at {0} accepted new connection from {1}",
        new Object[] { m_channel.getLocalAddress(), connection.getRemoteAddress() });
...
LOG.log(Level.SEVERE, "BBj Language Service at " + m_channel.getLocalAddress()
        + " problem accepting a connection from " + connection.getRemoteAddress(), t);
```

**Executor/`ThreadFactory` pattern** (lines 29-36) — the model for `ParserWorker`'s
per-connection single-thread daemon executor (D-13):
```java
private static final ExecutorService EXECUTOR = Executors.newCachedThreadPool(new ThreadFactory() {
    @Override
    public Thread newThread(Runnable r) {
        final Thread t = new Thread(r, "LanguageService");
        t.setDaemon(true);
        return t;
    }
});
```
`ParserWorker` follows the same named, daemon-thread `ThreadFactory` shape but wraps
`Executors.newSingleThreadExecutor(...)` instead of `newCachedThreadPool`, per D-13.

---

### `pom.xml` (config, batch)

**Analog:** itself, the existing `BBjStartup` `provided` dependency (lines 91-96)

```xml
<dependency>
  <groupId>com.basis</groupId>
  <artifactId>BBjStartup</artifactId>
  <version>${bbj.version}</version>
  <scope>provided</scope>
</dependency>
```
The new `ParserServiceAPI` dependency is added as a sibling block using the same
`${bbj.version}` property and `provided` scope (per RESEARCH.md §5):
```xml
<dependency>
  <groupId>com.basis</groupId>
  <artifactId>ParserServiceAPI</artifactId>
  <version>${bbj.version}</version>
  <scope>provided</scope>
</dependency>
```
No Surefire plugin block exists or is needed (RESEARCH.md §5: default-bound Surefire 3.5.4
already runs JUnit 5.9.1 natively) — do not add one.

---

### `README.md` (config/docs)

**Analog:** itself, existing terse-prose style (5 short paragraphs, no headers beyond the
title)

The two `mvn install:install-file` commands (D-16) are appended as a new short paragraph plus
a fenced code block, matching the file's existing plain-prose-then-detail structure — no
new section headers, consistent with the file's current lack of markdown structure beyond
the `# bbj-ls` title.

---

### `src/main/java/bbj/interop/data/ParseProgramParams.java` (model/DTO, request-response)

**Analog:** `src/main/java/bbj/interop/data/ClassInfoParams.java`

```java
package bbj.interop.data;

public class ClassInfoParams {

    public String className;

}
```
Public fields, no getters/setters, no constructor — `ParseProgramParams` follows this exactly:
`public String text; public String canonicalName; public String version; public List<String>
prefixes; public List<String> workspaceRoots;`.

---

### `src/main/java/bbj/interop/data/ParseProgramResult.java` and `ParseError.java` (model/DTO)

**Analog:** `src/main/java/bbj/interop/data/ClassInfo.java` (extends `WithError`) and
`src/main/java/bbj/interop/data/WithError.java`

```java
public class WithError {
    public String error;
}

public class ClassInfo extends WithError {
    public String name;
    public String packageName;
    ...
    public List<FieldInfo> fields;
    public boolean isDeprecated;
}
```
Same public-field, no-getter/setter convention as `ParseProgramParams`. Per RESEARCH.md §3's
finding that a single error line can carry multiple `ErrorType` values simultaneously,
`ParseError` must declare `public List<String> categories;` (not a singular `category`
field) — this is the one place the DTO analog needs a deliberate deviation from the "one
field per JSON key" instinct the `ClassInfo` analog would otherwise suggest. `ParseError`'s
other fields (`message`, `editorStartLine`, `editorEndLine`, `startCharacter`,
`endCharacter`) are plain public fields exactly like `ClassInfo`'s. `ParseProgramResult`
does **not** need to extend `WithError` — D-12 routes failures through
`ResponseErrorException`, not through a populated `error` field, so `ParseProgramResult`
is a plain DTO: `public String version; public List<ParseError> errors;`.

---

### `src/main/java/bbj/interop/ParserWorker.java` (new service, event-driven queue)

**No direct existing analog** (no per-connection worker/queue exists in `bbj-ls` today).
Closest structural precedent is `LanguageService`'s `ExecutorService`/`ThreadFactory` pair
(above) plus RESEARCH.md's own Pattern 1/Pattern 3 sketches (illustrative, not copied from
BBj source, D-19-safe), which should be treated as the primary template since no in-repo
analog exists:
```java
private final ExecutorService worker = Executors.newSingleThreadExecutor(/* daemon factory,
        modeled on LanguageService's EXECUTOR ThreadFactory */);
private final Map<String, PendingParse> latestByName = new ConcurrentHashMap<>();
```

---

### `src/main/java/bbj/interop/BbjPrefixAlgorithm.java` (new service, request-response)

**No direct existing analog.** Nearest structural sibling in `InteropService.java` is the
small, focused static inner class `BbjClassLoader` (lines 417-430) — a minimal class that
exists purely to expose one extra method (`addUrl`) beyond its parent's public API. The new
class follows the same "small, single-purpose, colocated in `bbj.interop`" sizing convention,
though as a *top-level* class (not a static inner class), per RESEARCH.md's recommended file
layout. RESEARCH.md's own Pattern 2 sketch is the primary content template (D-19-safe,
`bbj-ls`'s own illustrative code, not BBj source).

---

## Shared Patterns

### Bare-name `@JsonRequest`, `CompletableFuture<T>` return
**Source:** `src/main/java/bbj/interop/InteropService.java` lines 114-182 (every existing method)
**Apply to:** `parseProgram`
No `@JsonRequest("...")` string argument is used anywhere in this codebase — the RPC method
name is always the Java method name.

### `-Dbbj.interop.*` system-property convention
**Source:** `src/main/java/bbj/interop/InteropService.java` lines 59-60, 78-82
**Apply to:** D-14's per-parse timeout and document-size-cap properties
```java
private static final boolean VERBOSE = Boolean.getBoolean("bbj.interop.verbose");
```
New properties follow the identical `Boolean.getBoolean`/`Long.getLong`/`Integer.getInteger`
static-final-field style, same `bbj.interop.` prefix.

### `java.util.logging` for server-lifecycle events, not `System.out`
**Source:** `src/main/java/bbj/interop/LanguageService.java` lines 27, 85-95, 105-107
**Apply to:** D-12's "logs the failure once at WARNING with the remote address; no stack
trace at INFO" requirement — use `LanguageService`'s `Logger`/`Level.WARNING` convention, not
`InteropService`'s `System.out`-behind-a-flag convention (which is reserved for optional
verbose diagnostics, not warnings).

### Guava `Throwables` for unwrapping checked exceptions from futures/executors
**Source:** `src/main/java/bbj/interop/InteropService.java` lines 84-92
**Apply to:** `ParserWorker`'s handling of `ExecutionException` from its internal
`Future.get(timeout)` call (D-14), and `LanguageService`'s `run()`/`shutdownParserWorker`
paths.

### DTO convention: public fields, no getters/setters, optional `WithError` base
**Source:** `src/main/java/bbj/interop/data/ClassInfoParams.java`,
`src/main/java/bbj/interop/data/ClassInfo.java`, `src/main/java/bbj/interop/data/WithError.java`
**Apply to:** all three new DTOs (`ParseProgramParams`, `ParseProgramResult`, `ParseError`).
`WithError` itself is **not** the right base for `ParseProgramResult` — see the DTO section
above for why (D-12 uses `ResponseErrorException`, not an `error` field).

### `ResponseErrorException` for JSON-RPC application errors (D-12)
**Source:** lsp4j 0.20.1 (already a `provided`... actually compile-scope dependency in
`pom.xml` lines 86-90), confirmed present in the deployed jar per RESEARCH.md §7(b); not yet
used anywhere in `bbj-ls`'s own code, so there is no in-repo call-site to copy, only the
library API itself and RESEARCH.md's own worked example:
```java
throw new ResponseErrorException(new ResponseError(
    /* an application-defined code outside lsp4j's reserved ranges */ -32001,
    "Parse timed out after " + timeoutMs + "ms",
    null));
```
**Apply to:** `ParserWorker`'s timeout, size-cap, and unexpected-exception paths; the
superseded-request path (D-11) uses `ResponseErrorCode.RequestCancelled` the same way.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/test/java/bbj/interop/ParseProgramIT.java` | test | request-response | `bbj-ls` has no `src/test` directory and no existing test of any kind (confirmed: pom declares junit-jupiter 5.9.1 as a dependency but no matching source tree exists). Build on lsp4j's `Launcher.Builder` usage already present (non-test) in `LanguageService.java` lines 88-92, and RESEARCH.md §7(c)/§8's D-15 guidance for a real-socket client against `127.0.0.1:5008`. |
| `src/test/java/bbj/interop/MethodNotFoundProbeTest.java` | test | request-response | Same — no test analog exists. Use two in-process `Launcher`s over piped streams per RESEARCH.md §7(c); the local-service stand-in should mirror `InteropService`'s public method shape but intentionally omit `parseProgram`. |
| `src/test/java/bbj/interop/BBjServicesAvailability.java` | test utility | — | No test-infrastructure file of any kind exists yet in `bbj-ls`; this is a from-scratch JUnit 5 gate (e.g. a `@RegisterExtension`/`assumeTrue`-based reachability check against `127.0.0.1:5008`), with no established convention to imitate beyond ordinary JUnit 5 idioms. |

## Metadata

**Analog search scope:** `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/` (all 8 tracked
`.java` files under `bbj.interop` and `bbj.interop.data`), `/home/coder/repos/bbj-ls/pom.xml`,
`/home/coder/repos/bbj-ls/README.md`. All analogs verified tracked via
`git -C /home/coder/repos/bbj-ls ls-files`.
**Files scanned:** `InteropService.java` (432 lines, read in full), `LanguageService.java`
(137 lines, read in full), `pom.xml` (98 lines, read in full), `README.md` (11 lines, read in
full), `data/WithError.java`, `data/ClassInfoParams.java`, `data/ClassInfo.java`.
**Files NOT read (D-19 gate):** nothing under `/home/coder/repos/trunk/` or
`/home/coder/repos/tmp/grammar-info.md` was opened by this agent; all BBj-internal API facts
above are taken from RESEARCH.md's already-paraphrased findings, never re-derived from
proprietary source.
**Pattern extraction date:** 2026-09-22
