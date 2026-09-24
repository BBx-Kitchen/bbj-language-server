### Add a `parseProgram` request to the language-server interop service

Closes nothing on its own; it is the server half of live compiler diagnostics in the BBj VS Code
and IntelliJ extensions. Tracking issue: BBx-Kitchen/bbj-language-server#689.

#### What this adds

One new JSON-RPC request on the existing per-connection `InteropService`, beside `getClassInfo`
and `getAllClassNames`, on the same socket and the same launcher. It runs BBj's own parser over
document text supplied by the caller and returns the parser's errors. No other request changes.

The method name is the bare Java method name, `parseProgram`, exactly as every existing request in
this service is named. A `bbj-ls` build that predates this change answers the same call with
lsp4j's standard `MethodNotFound` (-32601), which is how the language server detects an older
BBjServices — once per connection, by probing, never by comparing version strings. No capability
request and no version query is added.

#### Request — `ParseProgramParams`

| Field | Type | Meaning |
|---|---|---|
| `text` | `String` | The full current text of the active document, including unsaved edits. |
| `canonicalName` | `String` | The document's path as the language server knows it. It is also the name the prefix algorithm answers for, so the active document resolves to the supplied text rather than to whatever is on disk. Matched by exact string equality — not case-folded, not Unicode-normalized. |
| `version` | `String` | Opaque to the server and echoed back unchanged. The server never interprets, compares or de-duplicates on it. |
| `prefixes` | `List<String>` | The PREFIX directories the caller wants referenced programs resolved through. May be empty. |
| `workspaceRoots` | `List<String>` | The workspace roots the caller wants referenced programs resolved through. May be empty. |

There is no type-checking flag and no password field. Type checking is off on this path, and this
endpoint does not open protected programs.

#### Result — `ParseProgramResult`

| Field | Type | Meaning |
|---|---|---|
| `version` | `String` | The request's own token, unchanged. |
| `errors` | `List<ParseError>` | The parser's errors, in the parser's own order. Always present; empty on a clean parse, never null. |

#### `ParseError`

| Field | Type | Meaning |
|---|---|---|
| `categories` | `List<String>` | BBj's own error-type strings for this error. This is a **list**, not a single value: one error line can legitimately carry several categories at once. On this path the observed values are `SyntaxError`, `LineNumberError`, `LineOrderError`, `DuplicateDeclarationError`, `ClassError` and `BadUseDeclarationError`. A type-check category cannot appear because type checking is off. The service passes through whatever the parser emits and validates nothing against this list. |
| `message` | `String` | The parser's own message, unchanged. |
| `editorStartLine` | `int` | BBj's editor starting line, verbatim. |
| `editorEndLine` | `int` | BBj's editor ending line, verbatim. |
| `startCharacter` | `int` | BBj's starting character position, verbatim. |
| `endCharacter` | `int` | BBj's ending character position, verbatim. |

**Coordinate convention.** These are the parser's editor-coordinate fields passed through
untouched: one-based lines and one-based character positions, and for the whole-line fallback case
the range spans the reconstructed line, starting at character position 1. The service does not
clamp, convert, zero-base or re-count anything, and it deliberately does not carry the interpreter
line fields. Converting to an editor's own zero-based range is the caller's job, and is where the
continuation-line, user-line-number, CRLF and no-final-newline cases are handled.

#### Referenced programs

The active document is parsed from the supplied text through an in-memory stream — it is never
read from or written to disk, and no temporary file is created. Programs it `USE`s or `CALL`s are
resolved by a prefix algorithm implemented in this service, in this order: an absolute path is
taken as-is; otherwise the active document's own directory, then each workspace root in the order
supplied, then each PREFIX entry in the order supplied; first existing regular file wins.
Referenced programs are read from disk as last saved — there is no overlay of other unsaved
editor buffers.

`config.bbx` is never read and `setConfig` is never called, so global-scope USE declarations from a
configuration file are invisible to this path. That is consistent with type checking being off,
since those declarations are only consumed by type resolution.

A reference that resolves nowhere is reported by BBj as its own error on the referencing line and
returned as an ordinary entry in `errors`. The service neither suppresses nor re-categorises it;
whether an IDE shows it as an error or a warning is the client's policy.

**Observed limitation.** Every reference-resolution shape exercised during verification — a bare
`USE` alone, a `USE` followed by a declaration, a `USE` followed by a constructor call, and a class
header extending a referenced class, tried both for a missing file and for an existing,
syntactically valid one — never actually reached this service's own prefix lookup. The lookup
above is implemented to this specification, but under type checking off (the setting this endpoint
ships with) BBj's own parser did not call into it for any of the tried forms; reaching it appears
to depend on a class-loading step this parse-only call sequence never triggers. The guarantee in
the paragraph above — that a missing reference surfaces as BBj's own error on the referencing
line — is therefore implemented and structurally reviewed, but not yet observed live through this
endpoint. This is an open question for reviewers, not a silently assumed fact, and is worth
confirming before Phase 102/103 build client-side expectations on top of it.

#### Versioning and supersession

Every request builds a fresh program-source UUID, which is what makes the parser re-parse rather
than serve its cached AST for the same canonical name.

Requests are latest-wins per connection and canonical name. A newer request for a document
supersedes an older one: a queued older request is never parsed at all, and an older request that
had already started finishes but its result is discarded. Either way the superseded caller
receives a JSON-RPC error with lsp4j's standard `RequestCancelled` code — never an errors list.
This holds even when the two requests carry identical version tokens and identical text; the
service never merges or short-circuits on equality. This is exercised live over the socket in both
the queued and the in-flight interleaving, and with identical version tokens.

#### Threading

One daemon worker thread per connection, torn down when the connection closes. All of one
connection's parses are serialised on it; different connections parse in parallel. This is
required, not merely tidy: the program factory and its type resolver are backed by plain
unsynchronised maps, and lsp4j's reader loop can dispatch a second request on one connection while
the first is still pending.

The program factory is built **once per connection** and reused for every request on it. Rebuilding
it per request would be a correctness bug, not just a cost: the parser's AST cache is keyed on
canonical name and relies on a long-lived per-instance record of the last source identity seen for
that name in order to invalidate itself, so a freshly built factory that has never seen a name can
serve a stale program another connection left in the shared cache.

**Known inherited limitation.** That shared program cache is process-wide and keyed on canonical
name alone. Two different connections parsing the *same* canonical name concurrently each keep
their own identity record and can therefore still race on it. This is a property of the parser API
rather than of this service, and it is not worked around here — synthesising a per-connection
canonical name would break the very name that reference resolution depends on. Flagging it so it
is a known quantity for reviewers and for the language-server side.

#### Failures are never syntax errors

Every failure travels as a JSON-RPC `ResponseError`, never as an entry in `errors`. The codes sit
outside the JSON-RPC reserved band (-32768 to -32000) and outside lsp4j's LSP reserved band
(-32899 to -32800):

| Code | Condition |
|---|---|
| -33001 | The parser threw while loading or serialising the program. |
| -33002 | The parse exceeded the configured timeout, or arrived while a previous parse on this connection was still overrunning. |
| -33003 | The request exceeded the configured size cap — either the document's byte length or the combined number of prefix and workspace-root entries. |
| -33004 | The parser service could not be obtained, or a required class was missing at runtime. |
| -33005 | The program is protected; this endpoint carries no password. |

Each failure is logged exactly once at `WARNING` with the peer address, the code and the message.
No stack trace, and the document text never appears in a log line.

An over-size document is exercised live over the socket and observed to fail with -33003 rather
than arriving as a normal result with an entry in `errors`.

#### Guards

| System property | Default | Effect |
|---|---|---|
| `bbj.interop.parse.timeoutMs` | 10000 | How long a caller waits for one parse before receiving -33002. |
| `bbj.interop.parse.maxBytes` | 4194304 | Largest accepted document, in UTF-8 bytes; over it the request is rejected with -33003 before it reaches the worker. |

Both follow the existing `-Dbbj.interop.verbose` convention. Either property falls back to its
listed default when given a non-positive override, rather than disabling the guard.

A note on the timeout: the parser exposes no cancellation hook and its scan-and-parse loop does not
check the interrupt flag, so a timeout can only stop the *caller* waiting — it cannot stop the
work. Rather than build a second worker thread (which would need a second factory, reintroducing
the staleness problem above), a connection whose parse is overrunning fails further requests fast
with -33002 until that parse finishes on its own. The size cap is therefore the load-bearing guard,
and the timeout is a liveness guarantee for the caller. The timeout code's shape is covered by an
in-process test; it was not additionally exercised over the live socket in this delivery, since
doing so would require restarting the shared BBjServices instance with a crippled global timeout
in place of the one this endpoint's own tests depend on — recorded here as a named, accepted gap
rather than a silent one.

#### Trust boundary

`parseProgram` joins an existing, unauthenticated localhost socket whose current requests already
expose the full BBj classpath. The paths it opens — the canonical name, the prefix entries and the
workspace roots — are supplied by the language server, which is a process on the same machine that
already reads those same files directly today. No new privilege boundary is crossed, and no
sandboxing is added for that reason; flagging it explicitly so the decision is visible rather than
implied.

#### Build

`ParserServiceAPI` is added as a `provided` dependency. It and `BBjStartup` are not on a public
registry; the README now documents installing both into the local Maven repository straight from a
BBj installation with `mvn install:install-file`, so the project builds with no BASIS Nexus
credentials. No Surefire configuration was added — Maven's default binding already runs JUnit 5.

#### Tests

This adds the first tests to the repository, under `src/test/java/bbj/interop`:
`ParseProgramIntegrationTest` drives a real lsp4j client against a running BBjServices on
127.0.0.1:5008 and covers syntax errors with positions, a clean program, an empty document, two
errors on different lines, a reference resolved through a workspace root, a reference resolved
through a PREFIX entry, a missing reference, supersession in both interleavings and with identical
tokens, and the size-cap code. It skips itself when the port is unreachable, unless
`bbj.interop.it.requireServer=true` is set. `MethodNotFoundProbeTest` needs no BBjServices at all:
it wires two in-process launchers together over pipes and pins that a service without the method
answers -32601 inside a bounded wait and writes nothing to standard error. `ParseGuardsTest`
covers the size cap and the code constants in process.

The older-server behaviour was additionally replayed by hand against the original pre-endpoint
`bbj-ls.jar` running under BBjServices: the probe returned lsp4j's standard MethodNotFound (-32601)
in 0.244 s (well under 5 s), and the service's own standard-error log gained exactly one line
beyond the two expected connection-accept lines — `WARNING: Unsupported request method:
parseProgram` — no stack trace, no other output. After the new jar was swapped back in,
`getClassInfo`, `loadClasspath` and `getAllClassNames` each answered with a normal result over a
fresh connection (93 methods for `java.lang.String`, `true`, and 90086 class names respectively),
and the whole test suite ran green again against the restored build.
