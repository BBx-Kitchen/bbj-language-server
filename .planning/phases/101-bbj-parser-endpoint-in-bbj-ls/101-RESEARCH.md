# Phase 101: BBj Parser Endpoint in `bbj-ls` - Research

**Researched:** 2026-09-22
**Domain:** JSON-RPC endpoint design over an internal Java compiler-integration API (BASIS `ParserServiceAPI`), inside the existing `bbj-ls` socket service
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** New bare-name `@JsonRequest` on `InteropService` (working name `parseProgram`), same per-connection launcher as `getClassInfo`/`getAllClassNames`. An older `bbj-ls` answers with lsp4j's standard `MethodNotFound` — no capability request, no version query.
- **D-02:** A request carries: full document **text**, the document's **canonical name**, a client-chosen opaque **version token** echoed back unchanged, the **PREFIX directories**, and the **workspace roots**. Nothing else (no type-checking flag, no password).
- **D-03:** Result is **errors only, as typed DTOs**: `{category, message, position fields}` plus the echoed version token. `category` is BBj's own error-type string as the JSON proxy emits it. The rest of the program model stays off the wire.
- **D-04:** Position fields are **BBj's editor fields verbatim** (editor start/end line, start/end character), documented in the DTO's Javadoc/MR text. No clamping or conversion — that is Phase 102's job.
- **D-05:** Program factory runs with **type checking off**; active document text goes through an in-memory stream supplier, never a temp file.
- **D-06:** Request carries PREFIX directories and workspace roots. Endpoint is **stateless per request** and **never calls `setConfig`** / never reads `config.bbx`.
- **D-07:** Lookup order for a referenced program name: absolute path as-is; otherwise **active document's directory → workspace roots in order → PREFIX entries in order**, first existing file wins. Referenced programs are read from disk.
- **D-08:** A referenced program that cannot be found is **BBj's own error** (ordinary error DTO on the `USE`/`CALL` line, BBj's own category/message). Endpoint doesn't suppress or re-categorize it.
- **D-09:** **Disk only for referenced programs** — no overlay of other unsaved buffers.
- **D-10:** Every request gets a **fresh program-source UUID** (BBj's AST parser caches by source identity); caller's version token is opaque, echoed back.
- **D-11:** **Latest-wins per connection and canonical name.** A queued older request is never parsed; an in-flight older one finishes but its result is discarded. Superseded caller gets `RequestCancelled`, never an errors list. *(Reversibility: costly.)*
- **D-12:** **Failures travel as JSON-RPC errors, never as errors-list entries**: exception, protected program, missing BBj class, timeout, or over-size document → `ResponseError` with an application-defined code (small fixed set, listed in the MR) and a message. Server logs the failure once at WARNING with remote address; no stack trace at INFO.
- **D-13:** **One parser worker thread per connection** (per `InteropService` instance), daemon, torn down when the connection closes; one editor's requests are serialized on it. Different editors parse in parallel. *(Researcher must establish thread-safety of the parser-service/program-factory objects — see Delegated Questions §1.)*
- **D-14:** **Server-side guards with defaults overridable by system property**: per-parse timeout (default ~10s) and document size cap (default low MB, planner picks), each a `-Dbbj.interop.*` property. Over limit → the D-12 error code, never a hung BBjServices thread.
- **D-15:** "Plain client" is a **JUnit 5 integration test in `bbj-ls` (`src/test`)** using lsp4j's jsonrpc as the client, **gated on reachable `127.0.0.1:5008`**, skippable/forceable by a system property. Covers: syntax error with positions; clean program → empty list; program referencing one file via workspace root and one via PREFIX; missing reference → BBj's error; two quick-succession requests → older gets `RequestCancelled`, newer's errors match newer text; timeout/size-cap error codes; and an **older-server probe against an in-process lsp4j launcher** whose local service lacks the method → `MethodNotFound` (no BBjServices needed). The probe is additionally replayed by hand against the original 26.02 jar.
- **D-16:** **Offline build from local BBj**: `mvn install:install-file` for `/opt/bbx/.lib/BBjStartup.jar` and `/opt/bbx/.lib/ParserServiceAPI.jar` into the default local repo under the coordinates the pom uses; `ParserServiceAPI` added to pom as `provided`. Install commands go into the `bbj-ls` README. No BASIS Nexus credentials needed. Researcher checks Surefire is recent enough for JUnit 5.
- **D-17:** **Deploy freely on this dev container**: copy built jar into `/opt/bbx/.lib/bbjls/`, stop/start BBjServices via `/opt/bbx/bin`, wait for `:5008` to accept. Original 26.02 `bbj-ls.jar` backed up **outside** that folder (wrapper loads every jar in `bbjls/`). Pre-existing requests (`getClassInfo`, `loadClasspath`, `getAllClassNames`) must still answer after the swap.
- **D-18:** **Done = branch + MR, merge not blocking.** Branch cut from `develop`, named after a GitHub issue of *this* repository the way `feat/447-get-all-class-names` was — file the issue first. MR opened on BASIS GitLab targeting `develop`, description states the contract. Merging is BASIS maintainers' call, doesn't block Phase 102.
- **D-19:** **No BBj source text enters this repository.** Name interfaces, methods, JSON keys, class names, file paths and behaviour; never quote BBj source blocks. Code from `bbj-ls` itself and from lsp4j may be quoted briefly.

### Claude's Discretion
- Exact method/DTO names — proposal: `parseProgram`; `ParseProgramParams {text, canonicalName, version, prefixes[], workspaceRoots[]}`; `ParseProgramResult {version, errors[]}`; `ParseError {category, message, editorStartLine, editorEndLine, startCharacter, endCharacter}` — and whether interpreter line fields ride along for debugging.
- Application error-code numbers/names; size-cap default; worker's queue implementation; `ServiceLoader` vs. direct construction; whether a program factory lives per connection or per request (subject to the identity-cache finding below).
- Test names, fixture programs, skip-when-no-server gate wording.
- Plan split and order. Obvious default: (1) build wiring — pom, offline jar install, README, a no-op request proving the deploy loop and MethodNotFound probe end to end; (2) the parse itself — prefix algorithm, DTO mapping, type checking off; (3) worker, latest-wins, guards, error codes; (4) integration test, hand replay against 26.02, issue, branch, MR.

### Deferred Ideas (OUT OF SCOPE)
- A reserved `typeChecking` flag / second method for a future type-aware pass (PSRV-10) — not added now.
- Password for protected programs.
- Raw program JSON (labels, classes, `USE` list) on the wire.
- Overlay of other open documents' unsaved text.
- An explicit `getCapabilities` request — `MethodNotFound` suffices for PSRV-04.
- Mirroring the endpoint into this repo's `java-interop/` reference copy.
- A JSON-RPC client for the conformance harness's endpoint mode (Phase 104).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PSRV-01 | `bbj-ls` offers an endpoint that runs BBj's parser on supplied document text, without reading/writing disk, type checking off, returns each error's category, message, editor line/character range | Confirmed the only route from `ProgramFactoryIF.loadSourceProgram` to diagnostics is `ProgramIF.doJSONSerialization()` (no typed diagnostics accessor exists on `ProgramIF`); confirmed exact JSON key names, that `"Errors"` is **always** present (empty array on success), that a single error can carry **multiple** `ErrorType` values, and the exact 1-based position semantics used for the whole-line fallback case. `InputStreamSupplierIF` is how text goes in-memory, never via a temp file. |
| PSRV-02 | Endpoint uses supplied text for active document, resolves referenced programs through configured prefixes/workspace roots, never returns an earlier version's results | Confirmed `PrefixAlgorithmIF.findProgram(String)→ProgramSource` contract (null on miss); confirmed the two-cache mechanism (`AstPrefixAlgorithm.m_programSourceLRUCache` + static `m_programCache`) that makes "fresh UUID per request" actually work, **and** the specific way it breaks if a fresh `ProgramFactoryIF`/`PrefixAlgorithmIF` pair is built per request instead of once per connection — this is the load-bearing finding behind D-13. |
</phase_requirements>

## Summary

`bbj-ls` already has the shape this phase needs: `InteropService` is a plain-Java, per-connection object with `@JsonRequest` methods returning `CompletableFuture`, public-field DTOs, and a `-Dbbj.interop.verbose`-style system-property convention — `parseProgram` is one more method beside `getClassInfo`/`getAllClassNames`, nothing architecturally new. The actual parse is four calls deep: `ParserServiceIF.getProgramFactory(prefixAlgorithm)` → `ProgramFactoryIF.setTypeChecking(false)` → `ProgramFactoryIF.loadSourceProgram(ProgramSource)` → `ProgramIF.doJSONSerialization()`. There is **no typed diagnostics accessor** anywhere on this path — `ProgramIF` exposes exactly one method, `doJSONSerialization()` returning a `String`; the only other diagnostics type in the API, `ToolDiagnosticIF`, belongs to `CompilerReportIF` (the `compile()`/`bbjcpl`-style entry point), a different, unrelated code path. `bbj-ls` must therefore parse the returned JSON itself (e.g. with Gson, already a transitive Gradle/Maven-world dependency of the BBj jars) and read the `"Errors"` array — which is **always present** (empty on a clean parse, confirmed by reading the serializer), where each error's `"ErrorType"` is itself an array (an error line can carry several simultaneous categories — `SyntaxError` **and** `BadUseDeclarationError` on one line is a real, observed shape, not a hypothetical).

The most consequential finding is about D-10/D-13's premise. BBj's "AST parser caches by source identity" is not one cache but two, both inside `AstPrefixAlgorithm` (the wrapper `BBjProgramJsonProxyFactory` builds around the caller's `PrefixAlgorithmIF`): a **per-instance** 50-entry LRU tracking the last UUID seen for each canonical name, and a **static, process-wide, 20-entry** `Cache<ProgramSource, BBjProgram>` shared by every `AstPrefixAlgorithm` in the JVM (because `ProgramSource.equals()`/`hashCode()` deliberately ignore the UUID and key only on canonical name). A fresh UUID per request only forces a re-parse if the **same, long-lived** `AstPrefixAlgorithm` instance previously saw an older UUID for that name and therefore invalidated the static cache entry — which is exactly what a per-connection, request-serialized worker (D-13) gives you for free. Construct a **new** `ProgramFactoryIF` per request instead, and its brand-new, empty per-instance LRU has never seen the canonical name before; it will happily return whatever stale `BBjProgram` another connection (or an earlier request that was never invalidated) already parked in the shared static cache, silently reintroducing the exact staleness bug D-11 exists to prevent. This is not a hypothetical performance nuance — it is the mechanism the whole D-10/D-11/D-13 design leans on, and it only works if the factory is built once per connection and reused for every request on it.

`bbj-ls`'s deployment loop is a name-registered `ServiceLoader` entry (`META-INF/services/com.basis.bbj.editor.api.ParserServiceIF` inside `BBjStartup.jar`, naming `com.basis.bbj.processor.program.service.ParserService`, whose class body itself lives in the much larger `BBj.jar`) reached through a URLClassLoader whose parent is BBjServices' own loader — `ServiceLoader.load(ParserServiceIF.class)` with the ambient thread context classloader is not guaranteed to see it reliably from inside `bbj-ls`'s own thread pool; pass `InteropService.class.getClassLoader()` explicitly. Neither `BBjProgram`'s parse path nor `BBjParser` contains any interrupt/cancellation check, so D-14's timeout must be a `Future.get(timeout)` that abandons (never joins) the worker thread — the underlying parse keeps running to completion regardless, which the planner should account for when sizing the size cap and deciding whether a timed-out connection's worker needs to be discarded rather than reused. Maven's build side is simpler than feared: with no Surefire version pinned in the pom, Maven 3.9.16's default binding resolves **Surefire 3.5.4** (confirmed via `mvn help:effective-pom` against the real repo), which runs JUnit 5 natively — no pom change needed there.

**Primary recommendation:** Add `parseProgram` to `InteropService` exactly like `getAllClassNames` is added today; build and hold one `ProgramFactoryIF` (wrapping one mutable, connection-scoped `PrefixAlgorithmIF` implementation and one single-thread `ExecutorService`) per accepted connection, constructed once in `InteropService`'s constructor or lazily on first use and never rebuilt; parse BBj's JSON output for the `Errors` array yourself (Gson is already present transitively); obtain `ParserServiceIF` once via `ServiceLoader.load(ParserServiceIF.class, InteropService.class.getClassLoader()).findFirst()`, not per request.

## Delegated Research Questions — Answers

### 1. Thread-safety of `ParserServiceIF`/`ProgramFactoryIF`, and the AST identity cache

- **`ParserServiceIF`/`ParserService` (the implementation registered in `BBjStartup.jar`'s `META-INF/services` file):** appears safe to treat as a process-wide singleton. `getProgramFactory(PrefixAlgorithmIF)` does nothing but construct and return a fresh `BBjProgramJsonProxyFactory(p_algorithm)` — no shared mutable state is touched [VERIFIED: /home/coder/repos/trunk/com/basis/bbj/processor/program/service/ParserService.java:522-579]. `ParserService`'s own instance fields are limited to constants and one unrelated static boolean (`DEVELOPER_EXEMPTION`, used only by `.gbf`-compiling/`compile()` paths, not by `loadSourceProgram`) [VERIFIED: same file:187-193, 1252-1274].
- **`ProgramFactoryIF` (`BBjProgramJsonProxyFactory`) is NOT thread-safe and must not be shared across threads without external serialization.** Its constructor builds a plain, non-synchronized `HashMap` (`m_useDeclarationsMap`) and a mutable `TypeResolver` field (`m_typeResolver`) that `setTypeChecking`/`setConfig` reassign in place [VERIFIED: /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/json/BBjProgramJsonProxyFactory.java:73-96,156-163,176-279,287-300]. The `TypeResolver` it wraps carries further plain (non-concurrent) `HashMap`-backed instance caches — `m_classNameToJavaType`, `m_classNameToClientObjectType`, `m_fullFileNameToProgramVersion`, `m_localIDMap`/`m_localIDMap2`/`m_localIDMap3` — mutated by ordinary (non-`synchronized`) methods such as `getJavaType`/`getClientObjectType`/`getLocalID` [VERIFIED: /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/type/TypeResolver.java:77-108,453-534,1037-1071]. Only three `TypeResolver` methods are `synchronized` (`getTypeForBBjCustomObject`, `dropProgramFromCache`, `clearBBjTypeCache`); the parse-critical paths are not. **This is direct, positive evidence for D-13**: the per-connection worker thread is not merely a convenience, it is required to avoid concurrent, unguarded `HashMap` mutation if two requests on the same connection were ever dispatched in parallel against the same factory.
- **The AST identity cache is two Guava caches inside `AstPrefixAlgorithm`** (the object `BBjProgramJsonProxyFactory` wraps the caller's `PrefixAlgorithmIF` in): a **per-instance**, non-static `Cache<ProgramSource, UUID> m_programSourceLRUCache` bounded to `maximumSize(50)`, and a **`private static final` (process-wide, shared across every `AstPrefixAlgorithm` instance in the JVM) `Cache<ProgramSource, BBjProgram> m_programCache`** bounded to `maximumSize(20)` [VERIFIED: /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/ast/AstPrefixAlgorithm.java:44-59]. `ProgramSource.equals()`/`hashCode()` compare **only** `m_canonicalName`, explicitly excluding the UUID ("2014-11-20: removed UUID from hashCode and equals") [VERIFIED: /tmp/claude-1000/.../scratchpad/parserapi/src/com/basis/bbj/editor/api/util/ProgramSource.java:14-15,125-159]. `getBBjProgram(...)`'s logic (read at lines 119-169 of `AstPrefixAlgorithm.java`): look up the last-seen UUID for this canonical name in the per-instance LRU; if the current request's UUID differs, **invalidate** the shared static cache entry for that canonical name before consulting it; otherwise (including "never seen before" — `check == null`) fall through to whatever the static cache currently holds for that canonical name [VERIFIED: /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/ast/AstPrefixAlgorithm.java:134-169]. **Bounded, not leaking** — the static cache never exceeds 20 entries and the per-instance LRU never exceeds 50; a fresh UUID every request cannot grow either cache unboundedly. **The correctness hazard is orthogonal to memory**: a per-instance LRU that has never seen a canonical name before (`check == null`, true on the very first call of a brand-new instance) does **not** invalidate the static cache, so a fresh `AstPrefixAlgorithm` built per request would silently return a stale `BBjProgram` if the same canonical name is still sitting in the shared static 20-entry cache from an earlier connection or request cycle. **A factory built once per connection and reused for every request on that connection is therefore load-bearing for D-11's own correctness guarantee, not only for D-13's thread-safety concern.** A residual, smaller risk this cannot close even with per-connection reuse: two *different* connections parsing the *same* canonical document name concurrently each have their own, independent per-instance LRU and could still race on the shared static cache — flagged in Open Questions, out of scope to fully close in this phase.

### 2. `ParserServiceAPI` surface as it actually exists (unzipped to scratchpad from `ParserServiceAPI-sources.jar`)

- **`ParserServiceIF.getProgramFactory(PrefixAlgorithmIF p_algorithm) : ProgramFactoryIF`** [VERIFIED: /tmp/claude-1000/.../scratchpad/parserapi/src/com/basis/bbj/editor/api/ParserServiceIF.java:71].
- **`ProgramFactoryIF`**: `loadSourceProgram(ProgramSource) throws IOException : ProgramIF`; `prefixAlgorithm() : PrefixAlgorithmIF`; `setConfig(String) throws FileNotFoundException, IOException`; `setTypeChecking(boolean)` [VERIFIED: /tmp/claude-1000/.../scratchpad/parserapi/src/com/basis/bbj/editor/api/codecompletion/ProgramFactoryIF.java:16-58].
- **`ProgramIF`**: exactly one method, `doJSONSerialization() : String` [VERIFIED: /tmp/claude-1000/.../scratchpad/parserapi/src/com/basis/bbj/editor/api/codecompletion/ProgramIF.java:10-13]. **There is no typed diagnostics accessor on `ProgramIF`.** `ToolDiagnosticIF` (with `position()`, `message()`, `diagnosticKind()`, `programName()`) exists only as the element type of `CompilerReportIF.problems()`, the return of `ParserServiceIF.compile(List<String>)` — a completely separate, `bbjcpl`-style batch-compile entry point, not something `loadSourceProgram` ever returns [VERIFIED: /tmp/claude-1000/.../scratchpad/parserapi/src/com/basis/bbj/editor/api/compiler/CompilerReportIF.java:13-18; ParserServiceIF.java:60]. **`doJSONSerialization()` is the only route to error positions for this endpoint's purpose** — matching `/home/coder/repos/tmp/grammar-info.md`'s explicit recommendation ("consume its JSON/editor model", "String json = program.doJSONSerialization()").
- **`PrefixAlgorithmIF.findProgram(String p_fileName) : ProgramSource`** — receives a name "as it might appear in the program" (fully qualified or relative), implemented by the API's caller (i.e. by `bbj-ls`); returns `null` on a miss, confirmed by the caller-side null-check (`AstPrefixAlgorithm.getBBjProgram`: `if (source == null) { return program; }`) [VERIFIED: /tmp/claude-1000/.../scratchpad/parserapi/src/com/basis/bbj/editor/api/util/PrefixAlgorithmIF.java:18-42; /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/ast/AstPrefixAlgorithm.java:125-132].
- **`ProgramSource`**: immutable, built only via the static factories `newProgramSource(String canonicalName, UUID uuid, InputStreamSupplierIF)` and the password-carrying overload `newProgramSource(String canonicalName, String password, UUID uuid, InputStreamSupplierIF)`; `canonicalName()`, `password()` (nullable), `inputStreamSupplier()`, `getUUID()` are the accessors. `equals`/`hashCode` compare only `canonicalName` [VERIFIED: /tmp/claude-1000/.../scratchpad/parserapi/src/com/basis/bbj/editor/api/util/ProgramSource.java:22-171].
- **`InputStreamSupplierIF`**: one method, `openInputStream() throws IOException : InputStream`, documented to always return a **new** stream, never reuse one [VERIFIED: /tmp/claude-1000/.../scratchpad/parserapi/src/com/basis/bbj/editor/api/util/InputStreamSupplierIF.java:12-25]. This is the in-memory route D-05 requires — wrap the request's `text` field in a fresh `ByteArrayInputStream`-backed supplier per call, no temp file ever touches disk.
- **`SourcePosition`**: `startLine()`/`endLine()`/`startPosition()`/`endPosition()` (1-based, "interpreter" coordinates) plus `editorStartLine()`/`editorEndLine()` (1-based, translated for an editor) and `isTranslated()` [VERIFIED: /tmp/claude-1000/.../scratchpad/parserapi/src/com/basis/bbj/editor/api/util/SourcePosition.java:184-254]. D-04's "editor fields verbatim" maps to `editorStartLine()`/`editorEndLine()`/`startPosition()`/`endPosition()` as serialized (see §3).
- **`DiagnosticKind`**: a plain 3-value enum, `ERROR`, `WARNING`, `INFO` [VERIFIED: /tmp/claude-1000/.../scratchpad/parserapi/src/com/basis/bbj/editor/api/util/DiagnosticKind.java:7-12] — used by `ToolDiagnosticIF` (the `compile()` path), not by the JSON error list this endpoint reads.
- **`ToolDiagnosticIF`**: `position()`, `message()`, `diagnosticKind()`, `programName()`, `getI2ELineTranslationMap()`, `toObjectList()` [VERIFIED: /tmp/claude-1000/.../scratchpad/parserapi/src/com/basis/bbj/editor/api/util/ToolDiagnosticIF.java:11-53] — not reachable from `loadSourceProgram`/`ProgramIF`.
- `/home/coder/repos/tmp/grammar-info.md`'s "Recommended integration" section states this same call sequence (`getProgramFactory` → `setTypeChecking(false)` → `loadSourceProgram` → `doJSONSerialization()`) and explicitly names `doJSONSerialization()` as the JSON route — consistent with what the interfaces themselves permit [CITED: /home/coder/repos/tmp/grammar-info.md, "Recommended integration: use ParserServiceAPI"].

### 3. The JSON proxy's error block — exact keys, conventions, empty-case behaviour

Read directly from `BBjProgramGsonBuilder.java` (key-name constants), `BBjProgramJsonSerializer.java`/`ErrorGsonSerializer.java`/`SourcePositionGsonSerializer.java` (what actually gets written), and `BBjProgramJsonProxy.java`'s `ErrorProcessor` (what conditions produce which category).

- **Top-level shape**: the serialized program is a single JSON object; the error list lives under the key **`"Errors"`** (constant `ERROR_CATEGORY`) [VERIFIED: /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/json/BBjProgramGsonBuilder.java:145]. `BBjProgramJsonSerializer.serialize(...)` always calls `serializeCollection(...)` for every category including errors, and `serializeCollection` unconditionally does `p_jsonObject.add(p_typeReference, jsonArray)` regardless of how many elements the stream produced [VERIFIED: /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/json/BBjProgramJsonSerializer.java:109-114,140-152]. **A program with zero errors serializes `"Errors": []` — the key is always present, never absent.**
- **Each error object's keys**: `"ErrorType"` (constant `ERROR_TYPE`), `"ErrorMessage"` (`ERROR_MESSAGE`), `"ErrorPositionInfo"` (`ERROR_SOURCE_POSITION`) [VERIFIED: /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/json/BBjProgramGsonBuilder.java:145-148]. **`"ErrorType"` is itself a JSON array**, not a single string — `ErrorGsonSerializer.serialize(...)` calls `serializeCollection(p_element.getErrorTypeList().stream(), ..., ERROR_TYPE)`, and `ErrorJsonElement` stores `m_errorTypeList : List<ErrorTypeJsonElement>` via `addErrorType(...)`, each element itself a one-field object also keyed `"ErrorType"` (via `@SerializedName(BBjProgramGsonBuilder.ERROR_TYPE)` on `ErrorTypeJsonElement.m_errorType`) [VERIFIED: /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/json/ErrorJsonElement.java:26-30,56-66,92-105; ErrorGsonSerializer.java:41-66]. Reading `BBjProgramJsonProxy`'s `ErrorProcessor.buildErrorList()`, a single `ProgramLineError` independently checks `getBadUseDecl()`, `getClassError()`, `getDuplicateDecl()`, `getLineNumberType()`, `getLineOrder()`, `getSyntaxError()` and calls `element.addErrorType(...)` for **each** that is true — **one error position can legitimately carry more than one category at once** [VERIFIED: /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/json/BBjProgramJsonProxy.java:3038-3094]. **Consequence for the DTO (Claude's Discretion territory, D-03):** a single `category: string` field silently drops information when more than one flag fires on the same line; the recommendation is a `categories: string[]` field (or a documented "first wins" rule if the planner deliberately wants to keep it singular — but that should be a stated, deliberate choice, not an accidental truncation).
- **The full set of `ErrorType` category strings observed in this code path**: `"BadUseDeclarationError"`, `"ClassError"`, `"DuplicateDeclarationError"`, `"LineNumberError"`, `"LineOrderError"`, `"SyntaxError"` (all six from `ProgramLineError` flags) [VERIFIED: /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/json/BBjProgramJsonProxy.java:3041-3094], plus `"TypeCheckError"` — but that one is only ever added when `m_checker instanceof DefaultTypeChecker` [VERIFIED: same file:2953-2977], and with type checking off (D-05) `m_checker` is a `NoOpTypeChecker` (per `TypeResolver`'s constructor choosing `NoOpTypeCheckerFactory` when `p_checkTypes` is false — verified in TypeResolver's constructor logic), so **`"TypeCheckError"` cannot appear through this endpoint as designed**. A `"JsonSerializationError"` category also exists (`BBjProgramGsonBuilder.JSON_SERIALIZE_ERROR`) but is a self-inflicted marker for an exception during the *serialization* step itself (e.g. building the labels/functions/variables/classes lists), not a BBj-language error — surfaced as an ordinary error-list entry when the proxy's own Java code throws while building an unrelated section [VERIFIED: /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/json/BBjProgramJsonProxy.java:557-608].
- **Position field names and conventions** (`SourcePositionGsonSerializer.serialize`, unconditionally emits all six): `"InterpreterStartingLine"` (`START_LINE`), `"InterpreterEndingLine"` (`END_LINE`), `"EditorStartingLine"` (`EDITOR_START_LINE`), `"EditorEndingLine"` (`EDITOR_END_LINE`), `"StartingCharacterPosition"` (`START_POSITION`), `"EndingCharacterPosition"` (`END_POSITION`) [VERIFIED: /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/json/SourcePositionGsonSerializer.java:44-55; BBjProgramGsonBuilder.java:163-168]. All six are **1-based** per the `SourcePosition` Javadoc (§2). For the ordinary parser-error path (the whole-line fallback used by all six `ProgramLineError` categories), the actual values written are `startLine=endLine=`the 1-based interpreter line, `editorStartLine=editorEndLine=`the translated 1-based editor line, **`firstChar = 1`**, **`endChar = buffer.length()`** where `buffer` holds the reconstructed line text (i.e. the *whole line* is highlighted, not a sub-span) [VERIFIED: /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/json/BBjProgramJsonProxy.java:3096-3150] — this matches `/home/coder/repos/tmp/grammar-info.md`'s note that "fallback whole-line JSON errors historically use a starting character of 1" [CITED: /home/coder/repos/tmp/grammar-info.md, "Diagnostics and LSP ranges"]. When a line's reconstructed text is empty (a blank line carrying only a user line number), the position instead spans the digits of that user line number [VERIFIED: same file:3118-3138].
- `ErrorMessage` for the ordinary parser-error path is the original `ProgramLineError.getErrorMessage()`, rewritten via `updateErrorLineNumber(...)` to substitute the editor-compatible line number in place of whatever interpreter-line-number text BBj's own message originally embedded, so the message text and the position's editor line agree [VERIFIED: /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/json/BBjProgramJsonProxy.java:3152-3164].

### 4. `ServiceLoader.load(ParserServiceIF.class)` — does it work as-is inside `bbj-ls`?

- `BBjLSWrapper` (the class in BBjServices that boots `bbj-ls`) does **not** use `ServiceLoader` for anything related to `ParserServiceIF` — it loads `bbj.interop.LanguageService` (bbj-ls's own entry class) reflectively by fully-qualified name from a dedicated `URLClassLoader` (`BBJLS_CL`) built over every jar under `<bbj lib>/bbjls/`, whose **parent** is `BBjLSWrapper`'s own classloader (i.e. BBjServices' main loader) [VERIFIED: /home/coder/repos/trunk/com/basis/server/BBjLSWrapper.java:33-46,168-190]. This confirms the canonical_refs claim that `bbj-ls` classes and BBjStartup/ParserServiceAPI/BBj's own classes are all visible to `bbj-ls` because of parent delegation, not because of any `ServiceLoader` wiring at the BBjServices level.
- `META-INF/services/com.basis.bbj.editor.api.ParserServiceIF` genuinely exists inside `/opt/bbx/.lib/BBjStartup.jar`, confirmed by `unzip -l`, and its single line of content is `com.basis.bbj.processor.program.service.ParserService` [VERIFIED: unzip -p on /opt/bbx/.lib/BBjStartup.jar, this session]. **However, the `ParserService` class body itself is not in `BBjStartup.jar`** — a jar-by-jar search of every jar in `/opt/bbx/.lib/` found it only inside `BBj.jar` [VERIFIED: shell search across /opt/bbx/.lib/*.jar for `processor/program/service/ParserService.class`, this session]. So a correct `ServiceLoader.load(ParserServiceIF.class, cl)` call needs a classloader `cl` whose resource/class visibility spans **three** jars simultaneously: `ParserServiceAPI.jar` (the interface), `BBjStartup.jar` (the registration file), and `BBj.jar` (the implementation class) — all three are on BBjServices' own main classpath (`/opt/bbx/.lib/`), which is the **parent** of `bbj-ls`'s own `URLClassLoader`.
- `java.util.ServiceLoader.load(Class)` (no explicit classloader argument) uses `Thread.currentThread().getContextClassLoader()`. `bbj-ls`'s own connection-handling threads are created by a custom `ThreadFactory` inside a `Executors.newCachedThreadPool(...)` in `LanguageService` [VERIFIED: /home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java:29-36] — nothing in this code path explicitly sets a context classloader, so relying on the ambient default is fragile and environment-dependent (it happens to work if the JVM's default context classloader chain still resolves through BBjServices' loader, but that is not something `bbj-ls`'s own code controls or should assume). **Recommendation: call `ServiceLoader.load(ParserServiceIF.class, InteropService.class.getClassLoader())` explicitly.** `InteropService.class.getClassLoader()` is, by construction, `bbj-ls`'s own `URLClassLoader` (`BBJLS_CL`), whose parent is BBjServices' main loader — `ClassLoader.getResources(...)` (which `ServiceLoader` uses internally to find `META-INF/services` files) walks the full parent chain, so this explicit classloader deterministically finds the registration in `BBjStartup.jar` and can then load `ParserService` from `BBj.jar` through the same delegation chain, independent of whichever thread happens to make the call. This sidesteps the ambient-context-classloader risk entirely and needs no direct dependency on the internal implementation class `com.basis.bbj.processor.program.service.ParserService` (which is not part of the public `ParserServiceAPI.jar` contract).
- Obtain the singleton once (e.g. in a static holder or `InteropService`'s static initializer) — `ServiceLoader.load(...).findFirst()` — not per connection and not per request; see §1 for why the returned `ParserServiceIF` is safe to reuse as a singleton.

### 5. Build: pom.xml, Surefire, install coordinates, local toolchain

- **`mvn -v`**: Apache Maven 3.9.16, Maven home `/opt/maven` [VERIFIED: `mvn -v`, this session].
- **`java -version`**: OpenJDK 25.0.4.1 (Temurin) [VERIFIED: `java -version`, this session] — newer than the pom's `maven.compiler.release=21` target [VERIFIED: /home/coder/repos/bbj-ls/pom.xml:11-13], which is fine (a JDK 25 `javac` can target release 21 via `--release`).
- **`~/.m2` does not exist yet** [VERIFIED: `ls ~/.m2` → "No such file or directory", this session] — the first `mvn` invocation (install-file or a normal build) creates it.
- **Surefire**: the pom declares **no** `maven-surefire-plugin` configuration at all [VERIFIED: /home/coder/repos/bbj-ls/pom.xml, full file read, no surefire block present]. Running `mvn -f /home/coder/repos/bbj-ls/pom.xml help:effective-pom` against the real Maven Central resolves the default-bound plugin to **`maven-surefire-plugin:3.5.4`** [VERIFIED: `mvn help:effective-pom` output, this session, resolved and downloaded `maven-surefire-plugin-3.5.4.{pom,jar}` from `repo.maven.apache.org`]. Surefire 3.5.4 runs JUnit 5 (junit-jupiter) natively — **no pom change is needed for D-15's integration test to run under `mvn test`.**
- **Install coordinates**: the pom already declares `com.basis:BBjStartup:${bbj.version}` (`bbj.version=trunk-SNAPSHOT`) with `scope=provided` [VERIFIED: /home/coder/repos/bbj-ls/pom.xml:14,91-96]. The natural, consistent `install:install-file` invocation is therefore:
  - `mvn install:install-file -Dfile=/opt/bbx/.lib/BBjStartup.jar -DgroupId=com.basis -DartifactId=BBjStartup -Dversion=trunk-SNAPSHOT -Dpackaging=jar` (matches the pom's existing coordinates exactly).
  - For `ParserServiceAPI.jar`, the pom doesn't yet declare it; the discretionary, consistent choice is the same `groupId`/`version` scheme: `-DgroupId=com.basis -DartifactId=ParserServiceAPI -Dversion=trunk-SNAPSHOT -Dpackaging=jar`, added to the pom as `<dependency><groupId>com.basis</groupId><artifactId>ParserServiceAPI</artifactId><version>${bbj.version}</version><scope>provided</scope></dependency>`.
- Both install commands need to be documented in `bbj-ls`'s README per D-16 — no BASIS Nexus credentials are involved (`install:install-file` writes straight into the local `~/.m2` repository from the local file).

### 6. Deploy loop: BBjServices stop/start, current `bbjls/` contents, wrapper's jar-loading rule

- `/opt/bbx/bin/bbjservices` starts BBjServices: it is itself the start action (no `start`/`stop` sub-argument), building a `nohup "$BASIS_JAVAEXE" ... com.basis.startup.BBjServices ...` background command [VERIFIED: /opt/bbx/bin/bbjservices:374-390].
- `/opt/bbx/bin/stopbbjservices` stops it: it execs `"$BASIS_JAVAEXE" ... com.basis.startup.StopServer ...` [VERIFIED: /opt/bbx/bin/stopbbjservices:58-65]. So the deploy loop is: run `stopbbjservices`, wait for it to exit, copy the new `bbj-ls.jar` into `/opt/bbx/.lib/bbjls/`, run `bbjservices`, then poll `127.0.0.1:5008` (e.g. a TCP-connect retry loop) until it accepts.
- `/opt/bbx/.lib/bbjls/` currently contains exactly two files: `bbj-ls.jar` (23,389 bytes, dated Sep 1 07:56) and `org.eclipse.lsp4j.jsonrpc-0.20.1.jar` (137,420 bytes, dated Feb 28 2023 — the shipped lsp4j jsonrpc jar matching the pom's declared `0.20.1` exactly) [VERIFIED: `ls -la /opt/bbx/.lib/bbjls/`, this session].
- `BBjLSWrapper`'s static initializer resolves `BBJLS_PATH = BBjClassLoader.getBBjLib().resolve("bbjls")` and builds its `URLClassLoader` from `BBjClassLoader.resolveWildcard(BBJLS_PATH, "bbjls")` [VERIFIED: /home/coder/repos/trunk/com/basis/server/BBjLSWrapper.java:33-46] — i.e. **every** jar found under `bbjls/` is added to the classpath. A backup copy of the original `bbj-ls.jar` (e.g. renamed `bbj-ls.jar.orig-26.02` inside `bbjls/`, or better, moved to a sibling directory like `/opt/bbx/.lib/bbjls-backup/`) must **not** be left inside `bbjls/` itself with a `.jar` extension, or the wrapper will load its classes too, alongside the new build, with unpredictable which-wins-on-conflict behaviour. The safest choice is a directory entirely outside `bbjls/`.
- Confirming the pre-existing requests keep answering after the swap (`getClassInfo`, `loadClasspath`, `getAllClassNames`) is a straightforward smoke test — the same JUnit/manual client D-15 builds can just also send those three requests once against the freshly swapped jar.

### 7. lsp4j jsonrpc 0.20.1 mechanics (inspected via `javap` against the exact deployed jar, `/opt/bbx/.lib/bbjls/org.eclipse.lsp4j.jsonrpc-0.20.1.jar`)

- **(a) Unknown-method behaviour and the TS-side latch it already exercises**: `org.eclipse.lsp4j.jsonrpc.messages.ResponseErrorCode` is a plain enum whose constants include `MethodNotFound`, alongside `ParseError`, `InvalidRequest`, `InvalidParams`, `InternalError`, `serverNotInitialized`/`ServerNotInitialized`, `UnknownErrorCode`, `RequestFailed`, `ServerCancelled`, `ContentModified`, and **`RequestCancelled`** [VERIFIED: `javap -p` output against the deployed jar, this session]. The JSON-RPC 2.0 wire value for "Method not found" is the standard `-32601` [CITED: JSON-RPC 2.0 specification, well-known reserved error code]. `bbj-vscode/src/language/java-interop.ts` already implements exactly this latch for `getAllClassNames`: it defines `const METHOD_NOT_FOUND = -32601;` and, on a failed request, checks `(e as {code?:number})?.code === METHOD_NOT_FOUND` to permanently mark the augmented endpoint unavailable for that connection (`completeIndexResolved = true`), never retrying it, while leaving a **different** (transient) failure retryable [VERIFIED: /home/coder/repos/bbj-language-server/bbj-vscode/src/language/java-interop.ts:579-600,1281]. This is the exact pattern D-01/PSRV-04's "probe once per connection" is built on, on the client side; the server side (`bbj-ls`) needs to do nothing special to produce it — an unrecognized `@JsonRequest` method name is answered with `MethodNotFound` by lsp4j itself, automatically, for any server that simply doesn't have the method registered (an older `bbj-ls` build).
- **(b) Returning an application error from a `CompletableFuture`**: `org.eclipse.lsp4j.jsonrpc.services.GenericEndpoint` (lsp4j's dispatcher, wrapping the local service object registered via `Launcher.Builder.setLocalService(...)`) exposes `request(String, Object) : CompletableFuture<?>`, which looks up the matching `@JsonRequest` method and invokes it, propagating whatever `CompletableFuture` that method returns [VERIFIED: `javap -p` output, this session]. Completing that future **exceptionally** with a `ResponseErrorException` (constructed from a `ResponseError(code, message, data)`) is lsp4j's documented mechanism for signalling an application-level JSON-RPC error rather than a normal result — the framework serializes it into the JSON-RPC `error` object using the supplied numeric code, which is why D-12's "small fixed set of application-defined codes" works: pick codes outside the reserved JSON-RPC/LSP ranges (the enum's own `jsonrpcReservedErrorRangeStart`/`End` and `lspReservedErrorRangeStart`/`End` constants exist precisely to mark off the ranges a custom code must avoid) [VERIFIED: `javap -p` enum constant list, this session].
- **(c) `Launcher.Builder` for an in-process client+server pair**: `org.eclipse.lsp4j.jsonrpc.Launcher$Builder` is present in the deployed jar with the same API `LanguageService` already uses (`setLocalService(...)`, `setRemoteInterface(...)`, `setInput(...)`, `setOutput(...)`, `setExecutorService(...)`, `.create()`) [VERIFIED: /home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java:88-92; class presence confirmed via `javap`]. For D-15's "older-server probe against an in-process lsp4j launcher whose local service lacks the method", the standard construction is two `Launcher`s built over a pair of connected `PipedInputStream`/`PipedOutputStream` pairs (or `PipedInputStream`s wired to each other's writer) — one side's local service is a stand-in `InteropService`-shaped object that intentionally does **not** declare `parseProgram`, so a client-side `request("parseProgram", ...)` against it fails with `MethodNotFound` without needing a real socket or a real BBjServices.
- **(d) Concurrent dispatch on one connection — confirms D-13 is genuinely needed, not just cautious**: `org.eclipse.lsp4j.jsonrpc.json.ConcurrentMessageProcessor implements Runnable` reads and dispatches messages in a single `run()` loop, started once per `Launcher` via `startProcessing(MessageProducer, MessageConsumer, ExecutorService)` [VERIFIED: `javap -p` output, this session] — i.e. **one reader loop per connection**, matching `LanguageService`'s one-`Launcher`-per-accepted-socket design [VERIFIED: /home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java:83-92]. Because `GenericEndpoint.request(...)` returns immediately with whatever `CompletableFuture` the handler method itself returned (it does not block the reader loop on that future's completion), the single reader thread is free to read and dispatch a **second** incoming request on the **same connection** while the first request's future is still pending, as long as the handler method's own body returns quickly (which any handler that hands actual work off to a background worker — exactly what D-13 asks for — necessarily does). **Without D-13's own serialization, two `parseProgram` calls in flight at once on one connection is a real, reachable scenario, not a hypothetical** — confirming the per-connection worker is required both for `ProgramFactoryIF`'s own thread-unsafety (§1) and for making D-11's "queue, not concurrent race" semantics simple to implement.

### 8. Existing code shape in `bbj-ls`

- **`InteropService.java`** (409 lines read in full): `@JsonRequest` methods are declared with the bare method name as the RPC name (no explicit `@JsonRequest("...")` string argument used anywhere — lsp4j derives the name from the Java method name itself), return `CompletableFuture<T>`, and are simple synchronous bodies wrapped in `CompletableFuture.completedFuture(...)` [VERIFIED: /home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java:114-182,184-255]. DTOs are plain classes with public fields, no getters/setters, e.g. `ClassInfoParams { public String className; }`, `ClassInfo extends WithError { public String name; ...; public boolean isDeprecated; }`, `WithError { public String error; }` [VERIFIED: /home/coder/repos/bbj-ls/src/main/java/bbj/interop/data/ClassInfoParams.java:8-11; ClassInfo.java:10-25; WithError.java:3-5]. The `-Dbbj.interop.verbose` idiom: `private static final boolean VERBOSE = Boolean.getBoolean("bbj.interop.verbose");` plus a `logVerbose(String)` helper gated on it, printing to `System.out` [VERIFIED: /home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java:59-60,78-82] — the exact style D-14's own `-Dbbj.interop.*` timeout/size-cap properties should follow. `SCAN_CACHE` (`private static final Cache<ClassLoader, ClassPath> SCAN_CACHE = CacheBuilder.newBuilder().weakKeys().expireAfterWrite(10, TimeUnit.MINUTES).build();`) is the pattern for any shared, bounded, cross-connection state that should tolerate a replaced `ClassLoader` [VERIFIED: same file:57-73].
- **`LanguageService.java`** (137 lines read in full): a Guava `AbstractExecutionThreadService`; `run()` loops `m_channel.accept()` with a 1-second timeout so `isRunning()` is re-checked regularly; on each accepted connection it constructs `new InteropService()` and immediately builds and starts a `Launcher` over that connection's input/output streams, all dispatched onto the single shared `EXECUTOR` (`Executors.newCachedThreadPool`, daemon threads named `"LanguageService"`) [VERIFIED: /home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java:26-115]. **There is no explicit "connection closed" callback wired anywhere in this code today** — `launcher.startListening()`'s returned `Future` is discarded, and nothing observes it completing or failing. **This is a gap D-13's own "torn down when the connection closes" needs to close**: the natural mechanism is to capture `launcher.startListening()`'s returned `Future<Void>` and either add a completion listener (`ConcurrentMessageProcessor.wrapFuture`-style) or run it via `CompletableFuture.supplyAsync(...).whenComplete((r, t) -> interopService.shutdownParserWorker())` so the per-connection worker thread this phase introduces gets shut down deterministically when the socket disconnects, rather than only when the JVM exits.
- **Logging**: `LanguageService` uses `java.util.logging.Logger` (`Logger.getLogger(LanguageService.class.getName())`, `LOG.log(Level.INFO/SEVERE, ...)`) [VERIFIED: /home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java:27,85-95,105-107]; `InteropService` uses plain `System.out`/`System.err` gated by the verbose flag or unconditional `printStackTrace` on unexpected `Throwable`s [VERIFIED: /home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java:78-82,96-100,107-109]. D-12's "logs the failure once at WARNING with the remote address; no stack trace at INFO" should follow `LanguageService`'s `java.util.logging` convention (it already has a `Logger` instance and a working `Level.WARNING`/`Level.SEVERE` pattern to imitate), not `InteropService`'s ad hoc `System.out`.
- **`bbj-ls` has no tests and no test infrastructure today** — no `src/test` directory exists, no Surefire configuration, confirmed by `pom.xml`'s dependency list containing only `junit-jupiter:5.9.1` with `scope=test` and no matching source tree — D-15's integration test is genuinely the first test this repository will have.
- **Git state**: current branch `develop`; remotes: `origin/develop`, `origin/feat/447-get-all-class-names` (already merged into `develop` via a merge commit `d64b164`), `origin/main`, `origin/release/26.02`; remote URL `ssh://git@git.basis.cloud:10022/BASIS/bbj-ls.git` (BASIS GitLab over SSH) [VERIFIED: `git -C /home/coder/repos/bbj-ls branch -a`, `log --oneline -15`, `remote -v`, this session]. `feat/447-get-all-class-names`'s naming (`feat/<issue-number>-<slug>`) is the exact pattern D-18 asks the new branch to follow, off a filed GitHub issue in *this* (`bbj-language-server`) repository.

### 9. Prefix algorithm semantics; what `setConfig` does and why the factory works without it

- `PrefixAlgorithmIF.findProgram(String)` receives the referenced name exactly as it appears in the BBj source (e.g. from a `::foo.src::Foo` type reference or a `USE`/`CALL` target), may be absolute or relative, and returns a `ProgramSource` or `null` (§2 above). D-07's lookup order (active document's directory → workspace roots → PREFIX entries, first existing file wins) is entirely `bbj-ls`'s own implementation logic inside its `findProgram` override; nothing in the API constrains that order.
- `ProgramFactoryIF.setConfig(String p_configName)` opens the named `config.bbx` file, scans it line-by-line for `USE ...` directives, classifies each as a Java type descriptor or a BBj type descriptor (`::file::Class` form), and populates `m_useDeclarationsMap : Map<String, FullyQualifiedTypeDescriptor>`, then rebuilds the `TypeResolver` (`createTypeResolver()`) so that map becomes available as **global-scope** USE declarations during type resolution [VERIFIED: /home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/json/BBjProgramJsonProxyFactory.java:175-300]. **The factory works perfectly well without ever calling `setConfig`**: its constructor already builds a working `TypeResolver` (`new TypeResolver(m_algorithm, new AstTypeRuntime(), m_doTypeChecking, true, true)`) with an empty `m_useDeclarationsMap` [VERIFIED: same file:85-96] — `setConfig` is a purely additive, optional enrichment (global-scope USE declarations from a config file), never a precondition for `loadSourceProgram` to function. D-06's decision to never call it simply means config.bbx-level global USE declarations are invisible to this endpoint's type resolution — which is consistent with D-05 (type checking off) since those declarations are only consumed by the type-checking/type-resolution path in the first place.

### 10. Timeout/cancellation hooks

- **No cancellation hook exists in the parse path.** A targeted search of both `BBjProgram.java` (the parser entry point `readProgram` lives here) and `BBjParser.java` (the CUP grammar's action class) for `isInterrupted`, `InterruptedException`, or `Thread.currentThread()` found **zero matches in either file** [VERIFIED: `grep -rln "isInterrupted\|InterruptedException\|Thread.currentThread" BBjProgram.java BBjParser.java` → empty output, this session]. Nothing in `ParserServiceAPI`'s interfaces (`ProgramFactoryIF`, `ProgramIF`) exposes a cancel method either (§2).
- **Consequence for D-14**: the only viable timeout mechanism is `Future.get(timeout, unit)` on the worker thread's submitted parse task, and on timeout the caller must **not** rely on `Thread.interrupt()` actually stopping the parse — since nothing in the parse path checks the interrupted flag, an interrupted worker thread will keep running the JFlex/CUP scan-and-parse to completion (or until it throws for an unrelated reason) regardless. Practically this means: (a) the size cap (D-14) matters more than the timeout for actually bounding worst-case CPU time, since the timeout can only make the *caller* stop waiting, not make the *work* stop; (b) a connection whose worker thread is stuck past its timeout should probably be treated as unhealthy going forward (e.g. discard that connection's worker and build a fresh one for the next request, accepting that the old thread leaks until its parse eventually finishes on its own) rather than assumed recoverable — a decision the planner should make explicitly rather than inherit silently.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Running BBj's own parser over supplied text | API / Backend (`bbj-ls`, inside BBjServices) | — | `ParserServiceAPI` only runs inside a BBjServices process; no other tier has access to BBj's compiler |
| JSON-RPC transport, request/response framing, error codes | API / Backend (`bbj-ls`, lsp4j jsonrpc) | — | Existing `InteropService`/`LanguageService` infrastructure already owns this; PSRV-01/02 extend it, they don't introduce a new transport |
| Referenced-program resolution (prefixes, workspace roots) | API / Backend (`bbj-ls`'s `PrefixAlgorithmIF` implementation) | — | The API requires an in-process `PrefixAlgorithmIF`; resolution logic must live where that interface is implemented, i.e. inside `bbj-ls` |
| Per-connection worker thread / request serialization | API / Backend (`bbj-ls`) | — | Required by `ProgramFactoryIF`'s and the AST identity cache's own non-thread-safety (§1); cannot be pushed to a client tier |
| Coordinate conversion (BBj editor lines → LSP zero-based ranges) | Frontend Server (language server, `bbj-vscode`) | — | Explicitly out of scope for Phase 101 (D-04); this endpoint returns BBj's fields verbatim, untouched |
| Probe-and-fallback / `MethodNotFound` latch | Frontend Server (language server, `bbj-vscode`, Phase 102) | — | Out of scope for Phase 101; this phase only needs to *produce* the correct `MethodNotFound` behaviour on an old build, which lsp4j gives for free |

## Standard Stack

### Core (already declared in `bbj-ls`'s pom, verified current)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `org.eclipse.lsp4j:org.eclipse.lsp4j.jsonrpc` | 0.20.1 [VERIFIED: /home/coder/repos/bbj-ls/pom.xml:87-90; deployed jar confirmed identical at /opt/bbx/.lib/bbjls/org.eclipse.lsp4j.jsonrpc-0.20.1.jar] | JSON-RPC transport, `@JsonRequest` dispatch, `ResponseError`/`ResponseErrorCode`, `Launcher` | Already the transport for every existing `InteropService` request; §7 above confirms it has everything D-11/D-12/D-15 need out of the box |
| `com.basis:BBjStartup` | `trunk-SNAPSHOT` (2026-09-01 build) [VERIFIED: /home/coder/repos/bbj-ls/pom.xml:91-96] | `ParserServiceIF` registration (`META-INF/services`) | Already `provided`; unchanged by this phase |
| `com.google.guava:guava` | 33.5.0-jre [VERIFIED: /home/coder/repos/bbj-ls/pom.xml:82-85] | `Cache`/`CacheBuilder` for any new bounded shared state, `AbstractExecutionThreadService` | Already used for `SCAN_CACHE`; reuse the same idiom for any new server-side guard state |
| `org.junit.jupiter:junit-jupiter` | 5.9.1, test scope [VERIFIED: /home/coder/repos/bbj-ls/pom.xml:76-80] | D-15's integration test | Confirmed runnable as-is under the default-bound Surefire 3.5.4 (§5) |

### New for this phase
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `com.basis:ParserServiceAPI` | `trunk-SNAPSHOT` (2026-09-01 build, matching `BBjStartup`) | `ParserServiceIF`/`ProgramFactoryIF`/`ProgramIF`/`PrefixAlgorithmIF`/`ProgramSource` interfaces | Not on a public registry — installed offline from `/opt/bbx/.lib/ParserServiceAPI.jar` via `mvn install:install-file` (D-16); see §5 for exact coordinates |
| JSON parsing of `doJSONSerialization()`'s output | — | Reading the `"Errors"` array back out (§3) | Gson is already a transitive dependency of the BBj jars at runtime inside BBjServices (`BBjProgramGsonBuilder` uses `com.google.gson`); `bbj-ls` does not currently declare Gson directly — check whether it needs to add `com.google.code.gson:gson` as an explicit compile dependency, or whether it's already reachable transitively through `BBjStartup`'s own classpath at runtime inside BBjServices (untested in this session — flagged as an Open Question below) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Parsing `doJSONSerialization()`'s JSON string with Gson | The lower-level `BBjProgram.readProgram(...)` entry point directly | `grammar-info.md` explicitly discourages this ("couples the language server more tightly to BBj internals than ParserServiceAPI"); no reason to take it on for this phase |
| `ServiceLoader.load(ParserServiceIF.class, InteropService.class.getClassLoader())` | Direct `new com.basis.bbj.processor.program.service.ParserService()` | Direct construction needs a compile-time dependency on an internal implementation class not part of `ParserServiceAPI.jar`'s public contract, and is a private-package `com.basis.bbj.processor.*` type — the `ServiceLoader` route only depends on the public `ParserServiceIF` interface |

**Installation (offline, per D-16):**
```bash
mvn install:install-file -Dfile=/opt/bbx/.lib/BBjStartup.jar \
  -DgroupId=com.basis -DartifactId=BBjStartup -Dversion=trunk-SNAPSHOT -Dpackaging=jar
mvn install:install-file -Dfile=/opt/bbx/.lib/ParserServiceAPI.jar \
  -DgroupId=com.basis -DartifactId=ParserServiceAPI -Dversion=trunk-SNAPSHOT -Dpackaging=jar
```

**Version verification:** both jars are dated 2026-09-01 on this box (`ls -la /opt/bbx/.lib/*.jar`), the same compiler build as the conformance corpus baseline this milestone measures against (per STATE.md's "Baseline" note) — no separate registry lookup applies since these are private BASIS jars, not public-registry packages.

## Package Legitimacy Audit

**Not applicable in the usual sense.** This phase installs no packages from a public registry (npm/PyPI/crates). The two new "dependencies" (`ParserServiceAPI.jar`, and the already-`provided` `BBjStartup.jar`) are private BASIS-internal jars, obtained by copying files that already exist on this machine's local BBj installation (`/opt/bbx/.lib/`) and registering them into the local Maven cache with `install:install-file` — there is no npm/PyPI/crates registry lookup, no download from a public source, and no slopsquatting surface. `gsd_run query package-legitimacy check` does not apply to this ecosystem (no `--ecosystem` value covers "private internal jar, installed by hand"). The only registry-backed dependency touched by this phase is the already-present, already-verified `org.eclipse.lsp4j.jsonrpc:0.20.1` (unchanged) and `junit-jupiter:5.9.1` (unchanged) — both pre-existing in `pom.xml` before this phase and out of scope to re-audit here.

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
                 VS Code / IntelliJ (Phase 102, out of scope here)
                              |
                              |  JSON-RPC over TCP :5008
                              v
                 ,-------------------------------.
                 |     BBjServices process        |
                 |  ,---------------------------. |
                 |  |  bbj.interop.LanguageService | |  (accept loop; one Launcher
                 |  |    (per accepted socket)    | |   per connection, shared
                 |  `-----------+-----------------' |   cached EXECUTOR)
                 |              |                   |
                 |              v                   |
                 |  ,---------------------------.   |
                 |  |   InteropService (per       |   |  <-- new parseProgram()
                 |  |   connection instance)      |   |      lands here, beside
                 |  |                              |   |      getClassInfo etc.
                 |  |  +-----------------------+  |   |
                 |  |  | parser worker (1 daemon| |   |  <-- D-13: single thread,
                 |  |  | thread, single-        | |   |      serializes all
                 |  |  | threaded executor)     | |   |      parseProgram calls
                 |  |  +-----------+-----------+  |   |      for this connection
                 |  |              |                |   |
                 |  |              v                |   |
                 |  |  ,-----------------------.    |   |
                 |  |  | ProgramFactoryIF        |    |   |  <-- built ONCE per
                 |  |  | (BBjProgramJsonProxyFactory) |   |      connection; wraps
                 |  |  | + connection-scoped       |    |   |      one mutable
                 |  |  |   PrefixAlgorithmIF impl  |    |   |      PrefixAlgorithmIF
                 |  |  `-----------+-------------'    |   |
                 |  |              |                  |   |
                 |  |              v                  |   |
                 |  |     ParserServiceIF (singleton, |   |
                 |  |     ServiceLoader-obtained once)|   |
                 |  `------------------------------'    |
                 `----------------------+-----------------'
                                        |
                          BBj's own parser (BBjScanner -> CUP parser
                          -> BBjProgram -> BBjProgramJsonProxy)
                                        |
                                        v
                              JSON string ("Errors": [...])
                                        |
                              parsed back to DTOs by bbj-ls
                                        |
                                        v
                          ParseProgramResult{version, errors[]}
                          (or ResponseError on failure — D-12)
```

### Recommended structure inside `bbj-ls` (existing package layout, extended)
```
src/main/java/bbj/interop/
├── InteropService.java        # add: parseProgram(ParseProgramParams) @JsonRequest
├── LanguageService.java       # add: capture launcher.startListening()'s Future, tear
│                               #   down the connection's parser worker on completion
├── ParserWorker.java          # new: per-connection single-thread executor + latest-wins
│                               #   queue (D-11/D-13) wrapping ParserServiceIF/ProgramFactoryIF
├── BbjPrefixAlgorithm.java    # new: connection-scoped, mutable PrefixAlgorithmIF impl
│                               #   (D-07 lookup order; current-request text/prefixes/roots
│                               #   set immediately before each loadSourceProgram call)
└── data/
    ├── ParseProgramParams.java   # new DTO: text, canonicalName, version, prefixes[], workspaceRoots[]
    ├── ParseProgramResult.java   # new DTO: version, errors[]
    └── ParseError.java          # new DTO: categories[], message, editorStartLine, editorEndLine,
                                  #   startCharacter, endCharacter
```

### Pattern 1: Per-connection parser-service reuse (the load-bearing pattern from §1)
**What:** Build `ProgramFactoryIF` exactly once per accepted connection (in `InteropService`'s constructor or lazily on first `parseProgram` call), hold it for the connection's lifetime, and route every `parseProgram` call for that connection through the same instance on the same single worker thread.
**When to use:** Always, for this endpoint — never construct a fresh `ProgramFactoryIF` per request.
**Why (verified, §1):** the `AstPrefixAlgorithm`'s per-instance LRU tracker (`m_programSourceLRUCache`) is what makes the D-10 fresh-UUID mechanism correctly invalidate the shared static `m_programCache` on a version change; a brand-new instance per request starts with an empty tracker and cannot distinguish "never seen this name" from "seen it, but it changed," silently risking a stale hit from another connection's or an earlier request's leftover static-cache entry.

### Pattern 2: Mutable, connection-scoped `PrefixAlgorithmIF` implementation
**What:** Because `ProgramFactoryIF.loadSourceProgram(ProgramSource)` is called through a `PrefixAlgorithmIF` captured once at factory-construction time (`AstPrefixAlgorithm(p_algorithm)`), and each `parseProgram` request supplies a *different* active document text, canonical name, prefix list, and workspace-root list, `bbj-ls`'s own `PrefixAlgorithmIF` implementation needs mutable "current request" fields — updated immediately before the synchronous `loadSourceProgram` call on the same worker thread that owns them (safe because of Pattern 1's single-thread serialization) — so that `findProgram(canonicalName-of-the-active-document)` can hand back an in-memory `ProgramSource` for the *just-supplied* text, while `findProgram(anyOtherName)` falls through to the D-07 disk-based prefix/workspace-root lookup.
**Example (illustrative outline only — not copied from BBj source, per D-19):**
```java
// bbj.interop's own code — safe to sketch, not BBj/BASIS source
final class BbjPrefixAlgorithm implements PrefixAlgorithmIF {
    private volatile String activeCanonicalName;
    private volatile String activeText;      // set fresh per request
    private volatile List<String> prefixes;
    private volatile List<String> workspaceRoots;

    void primeForRequest(String canonicalName, String text,
                          List<String> prefixes, List<String> workspaceRoots) {
        this.activeCanonicalName = canonicalName;
        this.activeText = text;
        this.prefixes = prefixes;
        this.workspaceRoots = workspaceRoots;
    }

    @Override
    public ProgramSource findProgram(String fileName) {
        if (fileName.equals(activeCanonicalName)) {
            byte[] bytes = activeText.getBytes(StandardCharsets.UTF_8);
            return ProgramSource.newProgramSource(activeCanonicalName, UUID.randomUUID(),
                () -> new ByteArrayInputStream(bytes)); // fresh stream each call, per InputStreamSupplierIF's contract
        }
        // D-07 lookup order: absolute path as-is; else active doc dir -> workspace roots -> prefixes
        File resolved = resolveOnDisk(fileName, activeCanonicalName, workspaceRoots, prefixes);
        if (resolved == null) return null; // D-08: BBj reports its own error on the USE/CALL line
        return ProgramSource.newProgramSource(resolved.getCanonicalPath(), UUID.randomUUID(),
            () -> new FileInputStream(resolved));
    }
}
```
This is called once, synchronously, on the connection's single worker thread per Pattern 1 — no locking needed since D-13 already guarantees no concurrent access.

### Pattern 3: Latest-wins request supersession (D-11)
**What:** Per connection, track the most recently *submitted* version token per canonical document name. When a new `parseProgram` request arrives for a canonical name that already has an older request queued (not yet started), drop the older one from the queue without running it. When a new request arrives while an older one for the same name is *already running*, let the in-flight one finish (its result is simply discarded, replaced with a `ResponseError(RequestCancelled, ...)`), and queue the new one behind it.
**Example (structural sketch, `bbj-ls`'s own code, D-19-safe):**
```java
// One single-thread ExecutorService per connection (D-13). "queued" here is a
// simple in-memory map from canonicalName -> the latest still-pending request,
// so an older, not-yet-started request for the same name is naturally replaced
// (never enqueued twice) rather than needing separate cancellation bookkeeping.
private final ExecutorService worker = Executors.newSingleThreadExecutor(/* daemon factory */);
private final Map<String, PendingParse> latestByName = new ConcurrentHashMap<>();

CompletableFuture<ParseProgramResult> parseProgram(ParseProgramParams params) {
    CompletableFuture<ParseProgramResult> future = new CompletableFuture<>();
    PendingParse mine = new PendingParse(params, future);
    PendingParse superseded = latestByName.put(params.canonicalName, mine);
    if (superseded != null && !superseded.started) {
        superseded.future.completeExceptionally(
            new ResponseErrorException(new ResponseError(
                ResponseErrorCode.RequestCancelled, "superseded by a newer request", null)));
    }
    worker.submit(() -> runOne(mine));
    return future;
}
```

### Anti-Patterns to Avoid
- **Building a new `ProgramFactoryIF` per request:** breaks the AST-identity-cache invalidation mechanism (§1/Pattern 1) — a subtle staleness bug, not merely a performance loss.
- **Calling `ProgramFactoryIF.setConfig(...)`:** explicitly excluded by D-06; not needed for the factory to function (§9).
- **Relying on `Thread.interrupt()` to actually stop a timed-out parse:** confirmed to do nothing in the parse path (§10) — a timeout can only make the *caller* stop waiting.
- **Treating `category` as a single string:** silently drops information when BBj reports more than one `ErrorType` flag on the same line (§3) — model it as a list.
- **`ServiceLoader.load(ParserServiceIF.class)` with no explicit classloader:** fragile — depends on the calling thread's ambient context classloader, which `bbj-ls`'s own thread pool does not control (§4).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BBj syntax/parser-semantic validation | A hand-written scanner/grammar port | `ParserServiceAPI` (already the whole point of this phase) | `grammar-info.md`'s explicit "Executive summary": a from-scratch port must replicate the scanner, `PreScannerFilter`, `BBj.cup`, and `ParamValidation` and re-track every BBj release — this phase exists specifically to avoid that |
| Latest-wins request supersession | A hand-rolled generation counter compared across threads with manual `synchronized` blocks | A `ConcurrentHashMap<String, PendingParse>` keyed by canonical name plus the single-thread executor from D-13 (Pattern 3) | The single-thread executor already serializes execution; the map only needs to track "is there a newer submission" — no cross-thread mutable counters needed |
| Bounded shared cache for any new server-side state | A hand-rolled LRU with manual eviction | Guava `CacheBuilder` (`maximumSize`/`expireAfterWrite`), the exact pattern `SCAN_CACHE` already uses | Already a dependency, already the established idiom in this codebase |

**Key insight:** every piece of this phase that looks like it needs custom infrastructure (JSON error parsing, staleness detection, thread safety) turns out to already have either an existing convention in `bbj-ls` (Guava caches, `-D` system properties) or an existing, if non-obvious, mechanism inside `ParserServiceAPI` itself (the two-cache identity system) that a naive from-scratch design would likely reinvent worse.

## Common Pitfalls

### Pitfall 1: Per-request `ProgramFactoryIF` silently reintroducing stale results
**What goes wrong:** A newer request's parse appears to succeed, but the errors returned are from an *older* version of the same document — intermittently, only when the canonical name happens to still be in the shared static 20-entry cache from an earlier connection/request cycle.
**Why it happens:** A fresh `ProgramFactoryIF`/`AstPrefixAlgorithm` built per request starts with an empty per-instance LRU tracker, so it never invalidates the shared static `m_programCache` entry for a canonical name it's never personally seen before (§1).
**How to avoid:** Build the factory once per connection (Pattern 1); never rebuild it between requests on the same connection.
**Warning signs:** D-15's own "two requests in quick succession" test passing on a *fresh* factory per request but returning the wrong errors when the *same* canonical name was recently parsed by a different, closed connection in the same test run — a subtle test-ordering-dependent failure, not a deterministic one.

### Pitfall 2: Assuming a timeout actually stops the parse
**What goes wrong:** A slow/pathological document causes the worker thread to run past the D-14 timeout; the caller correctly gets an error back, but the abandoned thread keeps consuming CPU (potentially indefinitely) inside BBj's scanner/parser.
**Why it happens:** No interrupt or cancellation check exists anywhere in the parse path (§10, confirmed by direct search).
**How to avoid:** Treat the timeout purely as a caller-side `Future.get(timeout)` bound; decide explicitly (and document in the MR per D-18) whether a connection whose worker timed out gets a fresh worker thread for future requests or continues sharing the (possibly still-busy) old one.
**Warning signs:** repeated timeouts on one connection with CPU usage that doesn't correspondingly drop.

### Pitfall 3: `ErrorType` truncated to a single category
**What goes wrong:** A line with, e.g., both a syntax error and a duplicate-declaration error only reports one of the two to the client, because the DTO mapping took "the first" or "the last" `ErrorTypeJsonElement` instead of the whole list.
**Why it happens:** BBj's own JSON shape nests `ErrorType` as an array-of-single-key-objects (§3) — easy to misread as "one category per error" if only a happy-path fixture (a single `SyntaxError`) was tested.
**How to avoid:** Model the DTO field as `categories: string[]`, and include a two-category test fixture in D-15's integration test (the two-error test program CONTEXT.md's `<specifics>` already calls for is a good place to also exercise this).
**Warning signs:** an integration-test fixture deliberately engineered to trigger two simultaneous `ErrorType` flags (e.g. a bad `USE` reference combined with a syntax error on the same physical line) reporting only one category.

### Pitfall 4: `ServiceLoader.load(ParserServiceIF.class)` working in manual testing but failing under load/production threading
**What goes wrong:** The service resolves fine when tested from `main()`/a simple driver (whose context classloader happens to chain through BBjServices' loader), but intermittently fails to find the service when invoked from one of `LanguageService`'s pooled executor threads.
**Why it happens:** `ServiceLoader.load(Class)`'s implicit context-classloader lookup is thread-dependent and not something `bbj-ls`'s own thread-pool code sets explicitly (§4).
**How to avoid:** Always pass `InteropService.class.getClassLoader()` explicitly to `ServiceLoader.load(Class, ClassLoader)`.

### Pitfall 5: A backup jar left inside `bbjls/` during the D-17 deploy loop
**What goes wrong:** The rollback/backup copy of the original 26.02 `bbj-ls.jar` is loaded *alongside* the new build (since `BBjLSWrapper` loads every jar under `bbjls/`), producing unpredictable class-resolution conflicts (whichever jar's classes win depends on URLClassLoader ordering, not a deliberate choice).
**Why it happens:** `bbjls/` is a "load everything here" directory by design (§6) — an easy mistake if the backup is made with e.g. `cp bbj-ls.jar bbj-ls.jar.bak` in the same folder.
**How to avoid:** Copy the backup to a directory outside `bbjls/` entirely (e.g. `/opt/bbx/.lib/bbjls-backup/`).

## Code Examples

### Obtaining `ParserServiceIF` once (recommended pattern, D-19-safe — no BBj source quoted)
```java
// bbj.interop's own code
private static final ParserServiceIF PARSER_SERVICE = ServiceLoader
    .load(ParserServiceIF.class, InteropService.class.getClassLoader())
    .findFirst()
    .orElseThrow(() -> new IllegalStateException(
        "No ParserServiceIF registered — is BBjStartup.jar on the classpath?"));
```

### The four-call parse sequence (structural outline; method names/signatures are named per D-19's explicit permission, no method bodies copied from trunk)
```java
ProgramFactoryIF factory = PARSER_SERVICE.getProgramFactory(prefixAlgorithm); // once per connection
factory.setTypeChecking(false);                                              // D-05, once
// per request:
ProgramSource source = ProgramSource.newProgramSource(
    canonicalName, UUID.randomUUID(),                                       // D-10: fresh UUID
    () -> new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8))); // D-05: in-memory, no temp file
ProgramIF program = factory.loadSourceProgram(source);
String json = program.doJSONSerialization();
// then: parse `json`'s "Errors" array (Gson), map each element's "ErrorType" array,
// "ErrorMessage", and "ErrorPositionInfo".{EditorStartingLine,EditorEndingLine,
// StartingCharacterPosition,EndingCharacterPosition} into ParseError DTOs (D-04).
```

### `ResponseErrorException` for D-12's failure path (lsp4j, quotable per D-19)
```java
throw new ResponseErrorException(new ResponseError(
    /* an application-defined code outside lsp4j's reserved ranges */ -32001,
    "Parse timed out after " + timeoutMs + "ms",
    null));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Save-time `bbjcpl` compile as the only compiler-backed diagnostic source (v3.7-era, `bbj-cpl-service.ts`) | In-process `ParserServiceAPI` call over supplied (unsaved) text | This phase (101), consumed starting Phase 102 | Diagnostics can appear while typing, not only on save; `bbjcpl` remains for its existing role (Phase 103 reconciles the two so they don't duplicate) |
| BBj 26.02 (no `bbj-ls` parser endpoint) | BBj 26.03+ (parser endpoint ships) | 26.03 release, not yet installed on this box | This box stays on 26.02 plus the phase's own locally-built `bbj-ls.jar` swapped into `bbjls/` (D-17) — functionally equivalent to a 26.03-class build for this phase's verification purposes, since the underlying `ParserServiceAPI`/`BBjStartup` jars are already the 2026-09-01 build |

**Deprecated/outdated:** none identified — this is a net-new capability, not a replacement of an existing `bbj-ls` feature.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Gson is reachable at runtime for `bbj-ls` to parse `doJSONSerialization()`'s output, either transitively through `BBjStartup`'s own runtime classpath inside BBjServices or needing an explicit `com.google.code.gson:gson` compile dependency in `bbj-ls`'s own pom | Standard Stack, "New for this phase" | If not transitively reachable, the first build attempt fails with `NoClassDefFoundError`/`ClassNotFoundException` for `com.google.gson.*` at runtime (or a compile error if used directly) — a one-line pom fix (`bbj-ls` already ships a `copy-dependencies` step for runtime-scope jars) resolves it, no design impact |
| A2 | The proposed `com.basis:ParserServiceAPI:trunk-SNAPSHOT` Maven coordinate for the newly-installed jar is a reasonable, discretionary choice consistent with the existing `BBjStartup` coordinate scheme, not a value read from any existing pom or BASIS convention document | Standard Stack, Delegated Q5 | If BASIS has an internal convention for this artifact's coordinates that differs, the planner/MR author should confirm with BASIS maintainers before or during the MR review (D-18 already routes the MR through BASIS review) — low risk, purely a local-build convenience since these coordinates never leave this machine's `~/.m2` |
| A3 | A connection whose parser worker has genuinely timed out (D-14) should get a fresh worker thread for subsequent requests rather than continue queuing behind the possibly-still-running old parse | Pitfall 2 / Code Examples | If the planner instead chooses to keep queuing behind the old worker, a single pathological document can wedge an entire editor connection indefinitely even though each individual request "times out" correctly from the caller's point of view — worth an explicit decision, not an implicit one |

## Open Questions

1. **Cross-connection staleness of the shared static `m_programCache` (§1)**
   - What we know: the 20-entry cache is `private static final` — shared by every `AstPrefixAlgorithm` instance in the JVM, keyed only by canonical name (UUID excluded from `equals`/`hashCode`).
   - What's unclear: whether two different, simultaneously-open editor connections parsing files with the *same* canonical name (e.g. the same physical file opened in two IDE windows, or one editor connecting twice) could observe each other's stale results, since each connection's own per-instance LRU tracker has no visibility into another connection's UUID history for that name.
   - Recommendation: out of scope to fully close in this phase — Phase 101's own success criterion 3 only requires correctness for "two requests for the same document in quick succession" on presumably the same connection/client, which per-connection factory reuse (Pattern 1) does correctly guarantee. Flag as a known, inherited limitation of `ParserServiceAPI` itself in the MR description (D-18) so Phase 102/103 and BASIS reviewers are aware; do not attempt a bbj-ls-side workaround (e.g. synthesizing a unique canonical name per connection) since D-02 requires the canonical name to match what the prefix algorithm and `USE`/`CALL` resolution expect.

2. **Exact application error-code numbers (D-12/D-14)**
   - What we know: they must sit outside lsp4j's reserved JSON-RPC (`jsonrpcReservedErrorRangeStart`/`End`) and LSP (`lspReservedErrorRangeStart`/`End`) ranges (§7b), and the "small fixed set" must cover at minimum: parse exception, protected program, missing BBj class, timeout, over-size document.
   - What's unclear: the exact numeric values and symbolic names — explicitly Claude's Discretion per CONTEXT.md.
   - Recommendation: planner picks a small contiguous block (e.g. -32001 through -32005) and documents each in the MR description per D-18; no further research needed, this is a naming decision, not a technical unknown.

3. **Whether `bbj-ls`'s Gradle-era `copy-dependencies` step needs Gson added explicitly (see Assumption A1)**
   - What we know: `BBjProgramGsonBuilder` uses `com.google.gson.Gson`/`GsonBuilder` inside BBj's own jars; `bbj-ls`'s pom does not currently declare Gson.
   - What's unclear: whether Gson is already on BBjServices' main runtime classpath (making it transitively visible to `bbj-ls` through parent-classloader delegation, the same mechanism that makes `BBjStartup`/`ParserServiceAPI`/`BBj.jar` visible) without `bbj-ls` needing its own dependency.
   - Recommendation: attempt the build without adding Gson first (parent classloader almost certainly already provides it, since BBj's own JSON serialization depends on it and runs inside the same BBjServices process); add an explicit `provided`-scope Gson dependency only if a `NoClassDefFoundError` actually surfaces during D-15's integration test.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Maven | Building `bbj-ls` | ✓ | 3.9.16 [VERIFIED: `mvn -v`] | — |
| JDK | Building/running `bbj-ls` | ✓ | 25.0.4.1 (Temurin) [VERIFIED: `java -version`] | pom targets release 21; compiles fine under JDK 25 |
| Network access to Maven Central | Resolving default-bound Surefire, any other undeclared-version plugin | ✓ | confirmed live during `mvn help:effective-pom`, this session | — |
| `~/.m2` local repository | `install:install-file` targets, all Maven builds | ✗ (not yet created) | — | Created automatically on first `mvn` invocation; no fallback needed, just a note that D-16's install commands are the first to populate it |
| BBjServices running locally (`/opt/bbx/bin/bbjservices`) | D-15's integration test (gated), D-17's deploy loop, D-6's smoke test | ✓ | BBj 26.02, build 2026-09-01 | Test is explicitly gated/skippable when unreachable per D-15 |
| `/opt/bbx/.lib/BBjStartup.jar`, `/opt/bbx/.lib/ParserServiceAPI.jar` | D-16's offline install | ✓ | 2026-09-01 build [VERIFIED: file listing, this session] | — |
| A BASIS GitLab account / SSH access to `git.basis.cloud` | D-18's branch push + MR | Not verified in this session (no push attempted) | — | If unavailable, the branch/commits can still be prepared locally; only the final push/MR step would block — flag to the human operator before Plan 4 (per the obvious plan-split default) if SSH access to `git.basis.cloud` turns out not to be configured |

**Missing dependencies with no fallback:** none identified that would block implementation; only the final MR push (D-18) has an unverified external dependency (GitLab SSH access), and that step is explicitly "not blocking" per D-18 itself.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 (`junit-jupiter` 5.9.1, already declared, test scope) |
| Config file | none — Surefire 3.5.4 (Maven-default-bound, confirmed via `mvn help:effective-pom`, §5) runs JUnit 5 with zero pom configuration |
| Quick run command | `mvn -f /home/coder/repos/bbj-ls/pom.xml test -Dtest=ParseProgramMethodNotFoundTest` (the in-process, no-BBjServices-needed probe from D-15's last bullet) |
| Full suite command | `mvn -f /home/coder/repos/bbj-ls/pom.xml test` (BBjServices-dependent cases skip themselves per D-15's reachability gate when `127.0.0.1:5008` is unreachable) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PSRV-01 | Syntax error round-trips with category/message/editor line+char range, no disk I/O, type checking off | integration (gated on `127.0.0.1:5008`) | `mvn -f /home/coder/repos/bbj-ls/pom.xml test -Dtest=ParseProgramIT` | ❌ Wave 0 (new test class) |
| PSRV-01 | Clean program → empty errors list (not an absent key — confirmed serialization always emits `"Errors": []`, §3) | integration (gated) | same command, different `@Test` method | ❌ Wave 0 |
| PSRV-02 | Reference resolved via a workspace root and via a PREFIX entry, both parse in context | integration (gated) | same command | ❌ Wave 0 |
| PSRV-02 | Missing reference → BBj's own error on the `USE`/`CALL` line (D-08) | integration (gated) | same command | ❌ Wave 0 |
| PSRV-02 | Two quick-succession requests for one document → older gets `RequestCancelled`, newer's errors match newer text | integration (gated) | same command | ❌ Wave 0 |
| PSRV-01 (guards) | Timeout and size-cap produce the D-12 error codes, not a hang | integration (gated), plus a unit test for the size-cap check alone (no BBjServices needed) | same command | ❌ Wave 0 |
| PSRV-01 (compat) | Older-server probe (`MethodNotFound`) via an in-process lsp4j `Launcher` pair whose local service lacks `parseProgram` | unit (no BBjServices needed) | `mvn -f /home/coder/repos/bbj-ls/pom.xml test -Dtest=MethodNotFoundProbeTest` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the no-BBjServices-needed `MethodNotFoundProbeTest` and any pure-unit tests (size-cap check) — fast, always runnable.
- **Per wave merge:** the full gated integration suite against the locally running BBjServices (after D-17's deploy loop has swapped the new jar in).
- **Phase gate:** the hand replay against the original, backed-up 26.02 `bbj-ls.jar` (D-15's last bullet) — this one is inherently manual (it requires swapping jars back and forth) and should run once at phase close, not per commit.

### Wave 0 Gaps
- [ ] `bbj-ls/src/test/java/bbj/interop/ParseProgramIT.java` — covers PSRV-01/PSRV-02's gated scenarios
- [ ] `bbj-ls/src/test/java/bbj/interop/MethodNotFoundProbeTest.java` — covers the in-process older-server probe, no BBjServices needed
- [ ] A shared test helper for "is `127.0.0.1:5008` reachable" (the skip-when-no-server gate), e.g. `bbj-ls/src/test/java/bbj/interop/BBjServicesAvailability.java`
- [ ] Framework install: none needed — `junit-jupiter` is already declared and Surefire is already new enough (§5)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | The `parseProgram` endpoint sits on the same unauthenticated localhost socket (`127.0.0.1:5008`) as every other `InteropService` request today — no new auth surface introduced, and none of the existing requests have one either |
| V3 Session Management | No | Stateless per request by design (D-06); no session concept |
| V4 Access Control | No | Same trust boundary as the existing interop requests — anything able to reach `127.0.0.1:5008` already has equivalent capability |
| V5 Input Validation | Yes | The size cap (D-14) is the primary input-validation control — an oversized `text`/`prefixes`/`workspaceRoots` payload must be rejected with the D-12 error code before being handed to the parser, not merely "hoped" to time out cleanly |
| V6 Cryptography | No | No cryptographic material involved |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via `canonicalName`/`prefixes`/`workspaceRoots` causing the D-07 lookup to read an arbitrary file outside the intended project tree | Information Disclosure | This endpoint reads files the caller already names explicitly (the caller — the language server — already has filesystem access to the same machine/workspace in the existing, pre-101 architecture); no new privilege boundary is crossed, since the requesting language server process already reads these same files directly today. Document this in the MR rather than adding new sandboxing (D-19-consistent — no scope creep beyond the locked decisions) |
| Denial of service via an oversized or pathologically slow document | Denial of Service | D-14's size cap and timeout, explicitly designed for this; §10's finding that a timeout cannot actually stop an in-flight parse means the size cap is the more load-bearing of the two controls |
| A dropped/slow connection leaving its per-connection worker thread and `ProgramFactoryIF`/cache state running forever | Denial of Service (resource exhaustion) | D-13's "torn down when the connection closes" — §8 identifies that `LanguageService.java` today discards `launcher.startListening()`'s `Future` with no completion hook; this phase must add one (see Architecture Patterns, "Existing Code Insights" note under §8) |

## Sources

### Primary (HIGH confidence — read directly this session)
- `/home/coder/repos/bbj-ls/pom.xml`, `README.md`, `src/main/java/bbj/interop/**` (full files) — build config, existing DTO/service conventions
- `/tmp/claude-1000/.../scratchpad/parserapi/**` (unzipped `ParserServiceAPI-sources.jar`) — `ParserServiceIF`, `ProgramFactoryIF`, `ProgramIF`, `PrefixAlgorithmIF`, `ProgramSource`, `InputStreamSupplierIF`, `SourcePosition`, `DiagnosticKind`, `ToolDiagnosticIF`, `CompilerReportIF`
- `/home/coder/repos/trunk/com/basis/bbj/processor/program/service/ParserService.java`, `/home/coder/repos/trunk/com/basis/server/BBjLSWrapper.java`, `/home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/ast/AstPrefixAlgorithm.java`, `/home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/type/TypeResolver.java`, `/home/coder/repos/trunk/BBj/src/com/basis/bbj/processor/program/json/{BBjProgramGsonBuilder,BBjProgramJsonProxy,BBjProgramJsonProxyFactory,BBjProgramJsonSerializer,ErrorJsonElement,ErrorGsonSerializer,SourcePositionGsonSerializer}.java` — read in place, behaviour/names paraphrased per D-19, never quoted as code blocks
- `unzip -l`/`unzip -p` against `/opt/bbx/.lib/BBjStartup.jar`, `/opt/bbx/.lib/ParserServiceAPI.jar` — confirmed `META-INF/services` registration and jar contents
- `javap -p` against the deployed `/opt/bbx/.lib/bbjls/org.eclipse.lsp4j.jsonrpc-0.20.1.jar` — `ResponseErrorCode`, `GenericEndpoint`, `ConcurrentMessageProcessor`, `Launcher$Builder` structure
- `mvn -v`, `java -version`, `mvn -f /home/coder/repos/bbj-ls/pom.xml help:effective-pom` (live network resolution against Maven Central) — Surefire 3.5.4 default binding
- `/opt/bbx/bin/bbjservices`, `/opt/bbx/bin/stopbbjservices` — read in full, start/stop mechanics
- `git -C /home/coder/repos/bbj-ls {branch -a, log --oneline -15, remote -v}` — repository state
- `bbj-vscode/src/language/java-interop.ts` (full file) — the existing `MethodNotFound` latch pattern Phase 102 will reuse

### Secondary (MEDIUM confidence)
- `/home/coder/repos/tmp/grammar-info.md` — internal handoff notes, cross-checked against and consistent with the primary source reading above wherever both cover the same ground (recommended integration sequence, coordinate-space cautions, error-category-to-severity guidance)

### Tertiary (LOW confidence)
- JSON-RPC 2.0 spec's `-32601` "Method not found" reserved code — well-known, widely documented convention, not independently re-verified against the spec text in this session (cross-checked instead against both `ResponseErrorCode.MethodNotFound`'s presence in the deployed jar and its existing, working use in `java-interop.ts`)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version number and coordinate is read directly from the pom or confirmed via a live Maven resolution, no web search needed
- Architecture: HIGH — every claimed API contract, cache mechanism, and thread-safety property is read directly from the actual interface/implementation source or confirmed via `javap` against the exact deployed jar
- Pitfalls: HIGH — Pitfalls 1, 2, 3 and 4 are each derived from a specific, cited line range showing the actual mechanism, not general domain knowledge

**Research date:** 2026-09-22
**Valid until:** this phase's own scope is stable (internal APIs, not a fast-moving public ecosystem) — re-verify only if the local BBj build (`/opt/bbx/.lib/*.jar`, currently 2026-09-01) is upgraded before this phase's implementation lands, since jar contents were read directly from this exact build
