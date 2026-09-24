# Phase 101: BBj Parser Endpoint in `bbj-ls` - Context

**Gathered:** 2026-09-22
**Status:** Ready for planning

<domain>
## Phase Boundary

`bbj-ls` — the Java service that runs inside BBjServices on port 5008, in the separate
repository at `/home/coder/repos/bbj-ls` (BASIS GitLab, ships with BBj 26.03 and later) — gains
one JSON-RPC request that runs BBj's own parser (`ParserServiceAPI`) over document text supplied
by the caller and returns the compiler's errors with editor coordinates:

1. Supplied text in, BBj's parser errors out — each with its category, message and editor
   line/character fields — with type checking off and the active document never read from or
   written to disk (PSRV-01).
2. The active document is parsed from the supplied text; programs it `USE`s or `CALL`s are
   resolved through the prefixes and workspace roots the caller names, so a reference parses in
   context instead of failing (PSRV-02).
3. Every request carries a version identity; a superseded request's result is discarded, never
   returned as the current text's errors (PSRV-02, criterion 3).
4. A plain client against the locally running BBjServices exercises all of it, and a `bbj-ls`
   that predates the endpoint answers the same probe with a clean "unknown method" — no hang,
   no stack trace — which is what Phase 102 gates on (criterion 4).

Requirements: PSRV-01, PSRV-02.

**No file in this repository changes** — only `.planning/`. Not in this phase: the language-server
client, the probe-and-fallback logic, coordinate conversion to LSP ranges, diagnostic
reconciliation (Phases 102-103), the harness's endpoint mode (Phase 104), the in-repo
`java-interop/` mirror, a type-aware slow pass (PSRV-10), any editor feature.

</domain>

<decisions>
## Implementation Decisions

### Wire contract
- **D-01:** The endpoint is a **new bare-name `@JsonRequest` on `InteropService`** (working
  name `parseProgram`), next to `getClassInfo`/`getAllClassNames`, on the same per-connection
  launcher. An older `bbj-ls` answers it with lsp4j's standard MethodNotFound — that *is* the
  "unknown endpoint" signal; no capability request, no version query. — **Reversibility:**
  one-way — the method name and DTO field names are the contract Phase 102 codes against and
  BBj 26.03 ships; renaming after release means supporting two names.
- **D-02:** A request carries: the full document **text**, the document's **canonical name**
  (its path as the language server knows it; also the name the prefix algorithm answers for),
  a client-chosen opaque **version token** echoed back unchanged, the **PREFIX directories**
  and the **workspace roots** (D-06). Nothing else — no type-checking flag, no password.
- **D-03:** The result is **errors only, as typed DTOs**: a list of `{category, message,
  position fields}` plus the echoed version token. `category` is BBj's own error-type string
  as the JSON proxy emits it (`SyntaxError`, `LineNumberError`, …). The rest of the program
  model (labels, classes, `USE` list) stays off the wire until something consumes it.
- **D-04:** Position fields are **BBj's editor fields verbatim**: the editor start/end line and
  the start/end character position exactly as the JSON proxy's error-position block emits them
  (legacy one-based editor lines, character positions as given), with the convention stated in
  the DTO's Javadoc and in the MR text. The one tested conversion to zero-based LSP ranges is
  Phase 102's job (PSRV-05 fixtures: continuation lines, user line numbers, CRLF, no final
  newline). The endpoint never clamps or converts. — **Reversibility:** one-way — same contract
  argument as D-01.
- **D-05:** Locked from PSRV-01: the program factory runs with **type checking off**; the
  active document's text goes to BBj through an in-memory stream supplier, never through a
  temp file.

### Referenced-program resolution
- **D-06:** The **request carries the PREFIX directories and workspace roots** the language
  server already resolves for its own `USE`/`CALL` resolution (CFG-01, `resolveConfigPath`).
  The endpoint is stateless per request and **never reads `config.bbx`** — `setConfig` is not
  called.
- **D-07:** Lookup order for a referenced program name: an absolute path is taken as-is;
  otherwise the **active document's directory → workspace roots in order → PREFIX entries in
  order**, first existing file wins. Referenced programs are read from disk by the prefix
  algorithm and handed to BBj as ordinary program sources.
- **D-08:** A referenced program that cannot be found is **BBj's own error**, returned as an
  ordinary error DTO on the `USE`/`CALL` line with BBj's category and message. The endpoint
  neither suppresses nor re-categorises it; whether the IDE shows it as error or warning is
  client policy (Phase 103; the handoff notes suggest warning for incomplete workspace setups).
- **D-09:** **Disk only for referenced programs** — no overlay of other unsaved buffers. A
  `USE`d file open in another tab is seen as last saved.

### Version identity & supersession
- **D-10:** Every request gets a **fresh program-source UUID** (BBj's AST parser caches by
  source identity); the caller's version token is opaque to the server and echoed back.
- **D-11:** **Latest-wins per connection and canonical name.** A queued older request for the
  same document is never parsed; an in-flight older one finishes but its result is discarded.
  The superseded caller receives a JSON-RPC error with the standard RequestCancelled code —
  never an errors list. — **Reversibility:** costly — Phase 102's client is written against
  this guarantee; weakening it later means the client must re-add its own discard logic.
- **D-12:** **Failures travel as JSON-RPC errors, never as errors-list entries**: an exception
  from the parser, a protected program, a missing BBj class, a timeout or an over-size document
  each produce a `ResponseError` with an application-defined code (a small fixed set, listed in
  the MR) and a message. The server logs the failure once at WARNING with the remote address;
  no stack trace at INFO. This makes PSRV-08 ("a failure is never a syntax error") structural.
- **D-13:** **One parser worker thread per connection** (per `InteropService` instance), daemon,
  torn down when the connection closes; one editor's requests are serialized on it (which is
  also what makes D-11 a simple queue), different editors parse in parallel. The researcher
  establishes whether the parser-service and program-factory objects may be shared across
  threads; if not, the per-connection worker is the only thread that ever touches them.
- **D-14:** **Server-side guards with defaults overridable by system property**: a per-parse
  timeout (default about 10 s) and a document size cap (default in the low megabytes, planner
  picks), each a `-Dbbj.interop.*` property in the style of the existing verbose flag. Over the
  limit → the D-12 error code, never a hung BBjServices thread.

### Verification & delivery
- **D-15:** The "plain client" is a **JUnit 5 integration test in `bbj-ls` (`src/test`)** using
  lsp4j's jsonrpc as the client, **gated on a reachable `127.0.0.1:5008`** — skipped with a
  message otherwise, forceable by a system property. It covers: a syntax error with its
  positions; a clean program → empty list; a program that references one file through a
  workspace root and one through a PREFIX; a missing reference → BBj's error; two requests in
  quick succession → the older gets RequestCancelled and the newer's errors match the newer
  text; timeout and size-cap error codes; and the **older-server probe against an in-process
  lsp4j launcher whose local service lacks the method** → MethodNotFound (needs no BBjServices).
  The probe is additionally replayed by hand against the original 26.02 jar (D-17) so "no
  hang, no stack trace" is observed on a real older server, not only on a stand-in.
- **D-16:** **Offline build from the local BBj**: `mvn install:install-file` for
  `/opt/bbx/.lib/BBjStartup.jar` and `/opt/bbx/.lib/ParserServiceAPI.jar` (the 2026-09-01
  build, same compiler build as the corpus baseline) into the default local repository under
  the coordinates the pom uses; `ParserServiceAPI` is added to the pom as `provided`. The
  install commands go into the `bbj-ls` README. No BASIS Nexus credentials are needed or asked
  for. The researcher checks that the pom's Surefire is recent enough to run JUnit 5.
- **D-17:** **Deploy freely on this dev container**: copy the built jar into
  `/opt/bbx/.lib/bbjls/`, stop and start BBjServices through `/opt/bbx/bin`, wait for `:5008`
  to accept. The original 26.02 `bbj-ls.jar` is **backed up outside that folder** (the
  BBjServices wrapper loads every jar it finds in `bbjls/`), so the older-server probe can be
  replayed and the box restored. The pre-existing interop requests (`getClassInfo`,
  `loadClasspath`, `getAllClassNames`) must still answer after the swap.
- **D-18:** **Done = branch + MR, merge not blocking.** In `/home/coder/repos/bbj-ls`: a branch
  cut from `develop`, named after a GitHub issue of *this* repository the way
  `feat/447-get-all-class-names` was — no such issue exists yet, so one is filed first (title
  and body describe the endpoint and its contract, no BBj source text). All commits land on
  that branch; an MR is opened on BASIS GitLab targeting `develop` whose description states
  the contract (method name, request and result fields, coordinate convention, error codes,
  guards, system properties) so Phase 102 and the BASIS reviewers read one text. Merging is
  the BASIS maintainers' call and does not block Phase 102.
- **D-19:** **No BBj source text enters this repository.** Planning files, the GitHub issue and
  this repo's summaries name interfaces, methods, JSON keys and behaviour; the handoff notes and
  the BBj source tree are read in place, never quoted. The `bbj-ls` commits themselves live in
  BASIS's private repository.

### Claude's Discretion
- Exact method and DTO names — proposal: `parseProgram`; `ParseProgramParams {text,
  canonicalName, version, prefixes[], workspaceRoots[]}`; `ParseProgramResult {version,
  errors[]}`; `ParseError {category, message, editorStartLine, editorEndLine, startCharacter,
  endCharacter}` — and whether the interpreter line fields ride along for debugging.
- The application error-code numbers and their names; the size-cap default; the worker's
  queue implementation; whether the parser service is obtained through `ServiceLoader` on
  `ParserServiceIF` or by direct construction; whether a program factory lives per connection
  or per request (subject to what research finds about the identity cache's memory behaviour).
- Test names, fixture programs for the integration test (invented, minimal BBj), and how the
  skip-when-no-server gate is spelled.
- Plan split and order. Obvious default: (1) build wiring — pom, offline jar install, README,
  a no-op request that proves the deploy loop and the MethodNotFound probe end to end;
  (2) the parse itself — prefix algorithm, DTO mapping, type checking off; (3) worker,
  latest-wins, guards and error codes; (4) integration test, hand replay against 26.02, issue,
  branch and MR.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — "Phase 101" detail block (goal, four success criteria, ordering
  note) and the "Which repository each phase changes" paragraph
- `.planning/REQUIREMENTS.md` — PSRV-01, PSRV-02 (owned here); PSRV-03..09 as the consumer's
  needs the contract must make possible; the Out-of-Scope table
- `.planning/STATE.md` — "Active Constraints" (v4.5 entries: separate repository, probe not
  version string, no proprietary text), "Blockers/Concerns" (BBj 26.03-class build note)
- `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONTEXT.md` — the
  user's standing preference for lean phases (its `<specifics>`); nothing else carries over

### The repository this phase changes (outside this repo)
- `/home/coder/repos/bbj-ls/README.md` — origin of the project, Maven build, isolated
  ClassLoader note
- `/home/coder/repos/bbj-ls/pom.xml` — Java 21 release, lsp4j jsonrpc 0.20.1, guava, junit
  5.9.1 (test), `BBjStartup` provided; no Surefire configuration
- `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java` — the
  per-connection service the request is added to; `@JsonRequest` style, public-field DTOs,
  the `-Dbbj.interop.verbose` flag, `SCAN_CACHE` as the existing shared-state pattern
- `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java` — accept loop, one
  `InteropService` + lsp4j `Launcher` per connection on a shared cached thread pool
- `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/data/` — DTO conventions (`ClassInfo`,
  `WithError`)

### BBj's parser API (read in place, never copy)
- `/home/coder/repos/tmp/grammar-info.md` — the internal parser handoff notes: "Recommended
  integration: use ParserServiceAPI", "Suggested LSP parsing loop" (fresh UUID per version,
  discard stale results, type checking off), "Diagnostics and LSP ranges" (coordinate spaces,
  editor-line preference, severity mapping, "do not publish failures as syntax errors")
- `/home/coder/repos/trunk/BBj/libsources/ParserServiceAPI-sources.jar` — `ParserServiceIF`
  (`getProgramFactory`), `ProgramFactoryIF` (`loadSourceProgram`, `setTypeChecking`,
  `setConfig`, `prefixAlgorithm`), `ProgramIF` (`doJSONSerialization`), `PrefixAlgorithmIF`
  (`findProgram`), `ProgramSource` (canonical name, UUID, stream supplier, optional password),
  `InputStreamSupplierIF`, `SourcePosition`, `DiagnosticKind`, `ToolDiagnosticIF`
- `/opt/bbx/.lib/ParserServiceAPI.jar`, `/opt/bbx/.lib/BBjStartup.jar` — the deployed API
  and startup jars of the local BBj 26.02 (build 2026-09-01); `BBjStartup.jar` carries the
  `META-INF/services` registration of `ParserServiceIF`
- `/home/coder/repos/trunk/com/basis/server/BBjLSWrapper.java` — how BBjServices loads
  `bbj-ls`: every jar under `<bbj lib>/bbjls/` in a `URLClassLoader` whose parent is
  BBjServices' own loader (so the API and the parser are visible to `bbj-ls`)
- `/home/coder/repos/trunk/com/basis/bbj/processor/program/service/ParserService.java` —
  the `ParserServiceIF` implementation (`getProgramFactory` and its ClassLoader note)
- `/home/coder/repos/trunk/com/basis/bbj/processor/program/json/BBjProgramJsonProxyFactory.java`,
  `BBjProgramJsonProxy.java`, `BBjProgramGsonBuilder.java` — parse entry, JSON error block
  construction, and the JSON key names (`Errors`, `ErrorType`, `ErrorMessage`,
  `ErrorPositionInfo`, `EditorStartingLine`, `EditorEndingLine`, `StartingCharacterPosition`,
  `EndingCharacterPosition`)

### The consumer's side (context only, not changed here)
- `bbj-vscode/src/language/java-interop.ts` — `getAllClassNames`'s MethodNotFound latch (the
  once-per-connection probe pattern Phase 102 reuses), `sendRequestSafe`, the circuit breaker
- `bbj-vscode/test/bbj-test-module.ts` — `JavaInteropTestService`, the service double that
  already behaves like an old server without `getAllClassNames`

### Local environment
- `/opt/bbx` — BBj 26.02, BBjServices running (`/opt/bbx/bin/bbjservices`), `bbj-ls` deployed
  at `/opt/bbx/.lib/bbjls/` (writable, owner `coder`); Maven 3.9.16 and JDK 25 on the path,
  no `~/.m2`

### Project conventions
- `CLAUDE.md` — "Shell and File-Access Rules" (absolute paths, no `cd` chains, scoped
  searches); the same rules apply to work under `/home/coder/repos/bbj-ls`

No external specs or ADRs beyond the handoff notes — BBj's parser is the oracle.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `InteropService` — one instance per accepted connection, `@JsonRequest` methods with bare
  names, `CompletableFuture` results, public-field DTOs in `bbj.interop.data`; the new request
  sits beside `getAllClassNames`.
- `-Dbbj.interop.verbose` — the existing system-property convention for D-14's knobs.
- `SCAN_CACHE` (guava, weak keys, expiry) — the pattern for any shared, bounded server state.
- lsp4j jsonrpc 0.20.1 is already a dependency: `ResponseErrorException`/`ResponseError` for
  D-11/D-12, `Launcher.Builder` for the in-process older-server stand-in in D-15.
- `ProgramFactoryIF`/`PrefixAlgorithmIF`/`ProgramSource` (ParserServiceAPI) — the whole parse
  is four calls; the prefix algorithm is the only piece `bbj-ls` writes itself.

### Established Patterns
- Older-server detection is by MethodNotFound, latched once per connection on the TS side —
  the endpoint must not answer an unknown method any other way.
- Requests are dispatched by lsp4j on a shared cached thread pool: concurrent requests on one
  connection are possible today, hence the explicit per-connection worker (D-13).
- Logging is `java.util.logging` in `LanguageService` and `System.out` behind the verbose flag
  in `InteropService`; no stack traces on the normal path.
- `bbj-ls` has **no tests and no Surefire configuration** — the integration test in D-15 is
  the first; junit-jupiter 5.9.1 is already declared.

### Integration Points
- BBjServices → `BBjLSWrapper` → every jar in `<lib>/bbjls/` with BBjServices' loader as parent:
  `ParserServiceAPI.jar` and the parser implementation are reachable without touching the
  pom's runtime dependencies (they are `provided`).
- `ParserServiceIF` is `ServiceLoader`-registered by `BBjStartup.jar`.
- The JSON proxy's `Errors` block is the source of every DTO field in D-03/D-04.
- Phase 102 connects here through `java-interop.ts` on the same socket and launcher.

</code_context>

<specifics>
## Specific Ideas

- Local verification runs on **BBj 26.02 plus the new jar** — the endpoint ships in 26.03+,
  but the API it uses is already in the 26.02 install (jars dated 2026-09-01, the corpus
  baseline's compiler build), so "26.03-class build" means this box after D-17, not a download.
- The BBjServices wrapper loads *every* jar in `bbjls/` — a backup named `*.jar` inside that
  folder would be loaded too; keep backups outside it.
- The parser is tolerant at the line/statement level (invalid statements become error
  statements), so incomplete editor input still yields diagnostics on later lines; the
  integration test should include one such two-error program.
- The user wants the same lean phases as 98-100: smallest change that meets the four criteria,
  no folded todos, no capability riding along, no in-repo mirror.
- The MR description is the contract document: Phase 102's researcher reads it, not the Java.

</specifics>

<deferred>
## Deferred Ideas

- A reserved `typeChecking` flag on the request (or a second method) for the PSRV-10 slow,
  type-aware pass — not added now.
- Password for protected programs — the LS does not edit protected sources today.
- The raw program JSON (labels, classes, `USE` list) on the wire — for a future outline or
  `USE` resolution feature.
- An overlay of other open documents' unsaved text for multi-file edits.
- An explicit capability request (`getCapabilities`) — MethodNotFound suffices for PSRV-04.
- Mirroring the endpoint into this repo's `java-interop/` reference copy — the roadmap keeps
  Phase 101 out of this repository; Phase 102's service double is TypeScript-side.
- A JSON-RPC client for the conformance harness's endpoint mode — Phase 104.

### Reviewed Todos (not folded)
- "linking.test.ts Interop related tests fail even after a targeted class warm-up" — test
  harness in this repo; Phase 101 touches no file here.
- "Loosen single-line IF balance rule for the 5 re-flagged valid files" — validator residue,
  A2 already at 22 against a gate of 25; stays pending for a quick task.
- "A lost language-server connection is invisible to the plugin's crash detection" and "The
  server status log line prints a stale previous status" — IntelliJ server lifecycle, LSP4IJ
  #1672/#1673.
- "Phase 97 code-review follow-ups" — IntelliJ Node download.

</deferred>

---

*Phase: 101-BBj Parser Endpoint in `bbj-ls`*
*Context gathered: 2026-09-22*
