# Phase 61 Coverage — bbj-vscode/src/language/ (RVW-01, SEC-06)

**Swept tree:** branch `v4.0-stability-and-quality` at commit `62b1e7150b91eadf6300db62103ef638c41ab25c` — recorded once for the whole phase (D-15); not re-anchored per plan, so every plan in this file describes the same tree.

**Governing standard:** `.planning/reviews/INVENTORY.md` — the single immutable contract for Phases 61-69. Not edited by this phase.

**Dedup source:** INVENTORY's Frozen Open-Issue Snapshot (15 issues, queried 2026-08-17 via `gh issue list --state open --limit 60`). Phase 69 re-queries the tracker live immediately before filing, so this snapshot is not re-verified live at sweep time.

**Slice size:** 7 unit rows + 4 `.bbl` file-exception rows = 11 rows × 8 dimensions = **88 cells** (**50** `applies`, **38** `n/a`).

## Stopping Rule & Write Contract

**Stopping rule.** A unit's sweep is complete when: (i) each of its 6 live `applies` cells carries a verdict (`pass`/`fail`) plus a written line naming the concrete checks applied; (ii) every file in the unit's file list is named at least once inside that unit's own section — in a check line or in a finding's `location:` — so coverage is file-granular, not merely unit-granular; and (iii) every candidate claim raised during the sweep is either promoted to a finding record clearing its evidence tier, or written under that unit's Not-reproducible-dispositions heading (below) with its reason. Once (i)-(iii) hold, the unit is done; no further reading is licensed.

**Write contract.** Plans `61-02`..`61-07` each fill exactly one unit section below and touch nothing else — no fragment files, no assembly plan, no whole-file rewrite, and no rewording of a carried-forward `n/a` reason (D-03). Ordering across this shared file is enforced structurally by the wave dependency chain (D-04), not by an assumption about executor behavior: one plan per wave, waves 1-7, each plan's `depends_on` naming its predecessor in D-02's risk-rank order.

**Placeholder.** Every not-yet-recorded live-dimension cell line ends with the single lowercase word `pending`. This is mechanically checkable at every wave.

**D-05 checkpoint: approved.** The recording shape rendered in `## RU-61-06 — Java interop client` below — the `### Cells` line format, the written pass/fail check-line wording, the `n/a` verbatim carry-forward presentation, the 13-field fenced finding-record shape, and the four per-unit sub-blocks (`### Findings`, `### Not-reproducible dispositions`, `### Cross-unit referrals`, plus `### SEC-06 Trust Boundary` for this unit) — was reviewed against the grid/gate/exclusion-reasons sections above it and approved as rendered, with no revisions, before plan `61-02` runs. Per D-03/D-05 this shape is now frozen: plans `61-02`..`61-07` copy it unchanged into their own unit sections.

## Applicability Grid — Phase 61 slice

Cells below record applicability exactly as INVENTORY's grid states it (this table does not change as plans execute); the recorded pass/fail verdict for each live dimension lives in the matching unit's own `### Cells` block further down, so a coverage claim stays adjacent to its evidence (D-09) rather than being flattened into this summary table.

| Unit | D1 Security | D2 Correctness | D3 Performance | D4 Maintainability | D5 Test coverage | D6 Dependency health | D7 Cross-IDE parity | D8 Doc accuracy |
|---|---|---|---|---|---|---|---|---|
| `RU-61-06` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | n/a — R-D7-SHARED-LS | applies |
| `RU-61-01` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | n/a — R-D7-SHARED-LS | applies |
| `RU-61-03` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | n/a — R-D7-SHARED-LS | applies |
| `RU-61-02` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | n/a — R-D7-SHARED-LS | applies |
| `RU-61-04` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | n/a — R-D7-SHARED-LS | applies |
| `RU-61-05` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | n/a — R-D7-SHARED-LS | applies |
| `RU-61-07` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | n/a — R-D7-SHARED-LS | applies |

### File-exception rows

| File | Parent unit | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 |
|---|---|---|---|---|---|---|---|---|---|
| `lib/events.bbl` | `RU-61-07` | n/a — R-BBL-STATIC | applies | n/a — R-BBL-STATIC | applies | n/a — R-BBL-STATIC | n/a — R-D6-CENTRAL | n/a — R-D7-SHARED-LS | n/a — R-BBL-NODOC |
| `lib/functions.bbl` | `RU-61-07` | n/a — R-BBL-STATIC | applies | n/a — R-BBL-STATIC | applies | n/a — R-BBL-STATIC | n/a — R-D6-CENTRAL | n/a — R-D7-SHARED-LS | n/a — R-BBL-NODOC |
| `lib/labels.bbl` | `RU-61-07` | n/a — R-BBL-STATIC | applies | n/a — R-BBL-STATIC | applies | n/a — R-BBL-STATIC | n/a — R-D6-CENTRAL | n/a — R-D7-SHARED-LS | n/a — R-BBL-NODOC |
| `lib/variables.bbl` | `RU-61-07` | n/a — R-BBL-STATIC | applies | n/a — R-BBL-STATIC | applies | n/a — R-BBL-STATIC | n/a — R-D6-CENTRAL | n/a — R-D7-SHARED-LS | n/a — R-BBL-NODOC |

## D-17 Cell-Total Gate

Expected totals for this phase's slice of INVENTORY's Applicability Grid: **50 `applies`, 38 `n/a`, 88 total** (7 unit rows + 4 `.bbl` file-exception rows, 11 rows × 8 dimensions).

Re-derived directly from `.planning/reviews/INVENTORY.md` rather than restated, by the following awk pass over the Phase 61 unit rows and the four `lib/*.bbl` file-exception rows:

```bash
awk '/^\| `RU-61-0[1-7]` \|/ || /^\| `lib\/[a-z]+\.bbl` \|/ {a+=gsub(/applies/,"applies"); n+=gsub(/n\/a/,"n\/a")} END{print a, n, a+n}' .planning/reviews/INVENTORY.md
```

**Output:** `50 38 88`

This matches the stated totals. Per D-17: if this re-derivation ever disagrees with the stated totals, that disagreement is itself a defect to surface, not a number to quietly adopt. Plan `61-07` re-runs this gate as the phase's closing check.

## Exclusion reasons carried forward

Each block below is copied verbatim from `.planning/reviews/INVENTORY.md` §"Exclusion reasons" — not reworded, not re-derived.

**R-D6-CENTRAL** (11 cells in this slice — 7 unit rows + 4 `.bbl` rows, one `D6` cell each):

> "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."

**R-D7-SHARED-LS** (11 cells in this slice — 7 unit rows + 4 `.bbl` rows, one `D7` cell each):

> "This code is part of the single language-server binary (`out/language/main.cjs`) loaded identically by both VS Code and IntelliJ via LSP4IJ; there is no second, divergent implementation to compare it against, so no cross-IDE parity finding is obtainable here."

**R-BBL-STATIC** (12 cells — `D1`, `D3`, `D5` on each of the 4 `.bbl` rows):

> "`.bbl` files are static builtin-verb/function/label/variable data catalogs with no executable logic, no hot path, and no isolated regression-test surface of their own; content accuracy is assessed under D2 (values correct) and D4 (duplication against the `.ts` sibling), not under this dimension."

**R-BBL-NODOC** (4 cells — `D8` on each of the 4 `.bbl` rows):

> "`.bbl` catalogs are raw data files with no comments or docstrings to go stale; doc-accuracy review targets the `.ts` sibling files and `CLAUDE.md`/`VERBs.md` instead."

**Identity check:** 11 + 11 + 12 + 4 = 38, matching the 38 `n/a` cells in this slice.

## RU-61-06 — Java interop client

**Files (4 / 1,255 LOC):**
- `bbj-vscode/src/language/java-interop.ts` (955)
- `bbj-vscode/src/language/java-javadoc.ts` (219)
- `bbj-vscode/src/language/lib/bbj-api.ts` (12)
- `bbj-vscode/src/language/lib/fs-provider.ts` (69)

**Risk rank:** 1 of 7 Phase 61 units — the entire SEC-06 trust boundary: a configurable host/port, an unauthenticated JSON-RPC channel, and behavior against a malicious or unresponsive peer.
**Sweep method (D-08):** full read.
**Owning plan:** 61-01 (this plan).

### Cells
- D1 Security — fail — Checked handshake/auth on the `net.Socket` channel (none found — `java-interop.ts:91-142`); field-level validation before JSON-RPC response fields become `JavaClass`/`JavaField`/`JavaMethod`/`JavaPackage`/`DocumentationInfo` AST nodes (none — `java-interop.ts:543-667`); whether a response can influence a filesystem path, URI, or spawned process (it cannot — no such sink exists across these four files); what `JavadocProvider` does with disk-supplied documentation (loads only from its own initialize-time `roots`, not peer-influenced — `java-javadoc.ts:44-86`); whether `lib/fs-provider.ts`'s `bbjlib` virtual filesystem can serve beyond its four fixed catalog paths (it cannot — `fs-provider.ts:27-35` is a hardcoded switch defaulting to an empty string); and whether `interopHost`/`interopPort` are validated for type/range (they are not). 2 findings recorded: `P61-D1-001`, `P61-D1-002`.
- D2 Correctness & error handling — fail — Checked the cached `connection` field's behavior on post-connect socket error/close (never invalidated); whether concurrent `connect()` callers can race into two sockets (yes, no in-flight guard); whether a lost timeout race leaves an unhandled rejection (yes, on every `Promise.race` timeout pattern in this file); how a malformed/truncated response is handled (an uncaught `TypeError` on a missing `fields`/`methods` array); and whether `clearCache()` actually releases everything its doc comment claims (no — `completeClassIndex` survives). 4 findings recorded: `P61-D2-001`..`P61-D2-004`.
- D3 Performance & resource use — fail — Checked whether `resolvedClasses`/`childrenOfByName`/`pendingResolutions` are bounded (they are not); whether an unavailable peer causes repeated reconnect attempts per unresolved reference (yes — every resolution serializes through a single global lock, and each queued resolution independently pays the full 10s socket-connect timeout); and the cost of the implicit-import preload against the package list size (bounded to 8 packages, but every resolved member type still serializes through the same global lock, so cost scales with the full type-graph size reached from those 8 packages, not just the package count). 2 findings recorded: `P61-D3-001`, `P61-D3-002`.
- D4 Maintainability & code smells — fail — Checked java-interop.ts's size/responsibility count at 955 lines against the four-file unit (one class — `JavaInteropService` — bundles connection management, class resolution/caching, the global resolution lock, classpath loading, complete-class-index building, and package-tree storage: at least 5 distinct responsibilities); whether the request-sending paths repeat the same connect/await/error shape (yes — `getRawClass`, `loadClasspath`, `loadImplicitImports`, `ensureCompleteClassIndex` each independently call `connect()` then `sendRequest` inside their own try/catch with no shared helper); whether `JavadocProvider`'s singleton (`java-javadoc.ts:16-36`) is reachable and testable (it is a hard `getInstance()` singleton with a private constructor — the test double works around it via an `isInitialized()` check rather than dependency injection); and whether `lib/bbj-api.ts` at 12 lines earns its own module (checked — it is a single-purpose template-string constant with one consumer, `bbj-ws-manager.ts`; kept as a separate module for the same reason `bbj-module.ts`'s DI wiring separates other single-purpose constants, no defect). 3 findings recorded: `P61-D4-001`..`P61-D4-003`.
- D5 Test coverage gaps — fail — This unit owns the routing-table's 11 `test/linking.test.ts` "Interop related tests" failures (recorded as `P61-D5-001`, full evidence below; cross-ref D2). Also checked what is genuinely untested against the real client: socket error/close paths, the three timeout paths, malformed-response handling, and whether `test/bbj-test-module.ts`'s `JavaInteropTestService` double diverges from the real client in ways that would hide a defect — it does: `connect()`, `loadClasspath()`, `loadImplicitImports()`, and `resolveClassByName()` are all overridden to bypass the network entirely (`test/bbj-test-module.ts:108-123`), so none of `P61-D2-001`/`002`/`003`/`004` or `P61-D3-002`'s code paths are exercised by any test that currently passes (recorded as `P61-D5-002`). 2 findings recorded: `P61-D5-001`, `P61-D5-002`.
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — n/a — "This code is part of the single language-server binary (`out/language/main.cjs`) loaded identically by both VS Code and IntelliJ via LSP4IJ; there is no second, divergent implementation to compare it against, so no cross-IDE parity finding is obtainable here."
- D8 Comment & doc accuracy — fail — Checked every JSDoc block in the four files against what the code does, including the doc comment on `setConnectionConfig` (accurate — it correctly notes `clearCache()` must be called separately to reconnect) and `clearCache()` (`java-interop.ts:757-760`, inaccurate — "Clears all cached Java class data" but `completeClassIndex`/`completeIndexResolved` survive, same defect as `P61-D2-004` viewed from the doc-accuracy angle); and CLAUDE.md's §Architecture description of `java-interop.ts` ("connects to the java-interop socket service to resolve Java classes/methods/fields for completion and hover") and its DI service-group list (`services.java.JavaInteropService`, `bbj-module.ts:53-54`, `89-90`) against the code just read — both accurate, no divergence found. 1 finding recorded: `P61-D8-001`.

### SEC-06 Trust Boundary

**(1) What the peer controls.** Every field of a `getClassInfo`/`getClassInfos` JSON-RPC response — `name`, `simpleName`, `packageName`, `isDeprecated`, `fields[]`, `methods[]`, `constructors[]`, `error` (established by reading `java-interop/src/main/java/bbj/interop/InteropService.java:166-238` as reference material, D-13) — is copied directly onto AST nodes with no schema or type validation: `resolveClass()` assigns `javaClass.fields`/`methods`/`constructors` straight from the raw response (`java-interop.ts:543-596`); the hand-built hover-facing method signature string interpolates peer-supplied `method.returnType`/parameter types/names with no escaping (`java-interop.ts:632-637`); and peer-controlled class/method/field names look up local Javadoc, which is then embedded with no length bound via `tryParseJavaDoc()` into `DocumentationInfo.javadoc` (`java-interop.ts:638-643`, `896-905`). All of it later reaches hover and completion UI rendered by `RU-61-04`'s providers, outside this unit's files.

**(2) Authentication posture.** The channel is unauthenticated and unencrypted in both directions. The client opens a bare `net.Socket` and hands it directly to `createMessageConnection` with no TLS wrapper, no token exchange, and no peer-identity check (`java-interop.ts:91-108`, `125-142`). Read as reference material only (D-13): the server side confirms this — `SocketServiceApp.run()` binds `InetSocketAddress("localhost", 5008)` and calls `serverSocket.accept()` in an unbounded loop, launching an unauthenticated JSON-RPC endpoint for every accepted connection (`java-interop/src/main/java/bbj/interop/SocketServiceApp.java:30-45`). This is stated as a fact, not itself a finding — it becomes one only via what it enables (see (1) above, `P61-D1-002`).

**(3) Who can set the destination.** Two call sites feed `interopHost`/`interopPort` into `setConnectionConfig` (`java-interop.ts:116-120`), both outside this unit and referred to `RU-61-05` below: the LSP `initialize` handshake reads `params.initializationOptions.interopHost`/`interopPort`, defaulting to `'localhost'`/`5008` only when falsy (`bbj-ws-manager.ts:53-55`), and the `didChangeConfiguration` path reads `config.interop?.host`/`config.interop?.port` the same way (`main.ts:151-152`). Both are ordinary VS Code workspace settings — a workspace-scoped `.vscode/settings.json` committed inside a cloned repository can set both without any additional confirmation step visible in these four files or the two call sites, so merely opening an untrusted workspace can silently redirect every future Java-class lookup off loopback to an attacker-chosen host. Neither call site nor `setConnectionConfig` itself validates the port: `this.interopPort = port || 5008` (`java-interop.ts:118`) is a falsy check, not a type or range check — a non-integer, negative, out-of-range, or string-typed value passes through unmodified to `socket.connect(this.interopPort, this.interopHost)` (`java-interop.ts:140`). Recorded as `P61-D1-001`.

**(4) A malicious peer that answers.** Everything in (1) applies with no bound: no message-size limit, no depth limit, no schema check on any field before it reaches `resolvedClasses`, `childrenOfByName`, or the hover/completion-facing `DocumentationInfo`. A peer that returns a wrong-typed or missing `fields`/`methods` array reaches an unguarded loop and throws a raw, uncaught `TypeError` (`java-interop.ts:576`, `581` — contrast with `classes`/`constructors`, defensively defaulted with `??=` at `java-interop.ts:561-562`, but `fields`/`methods` are not); the `try` that guards resolution errors (`java-interop.ts:598`) wraps only the async Phase 2, not these synchronous Phase 1 loops. Recorded as `P61-D2-003` (secondary: D1). Hostile strings in `method.returnType`/parameter types/class names reach the hand-built signature string (`java-interop.ts:632-637`) and the Javadoc Markdown (`java-interop.ts:638-643`) with no escaping or length bound before either is handed to `RU-61-04`'s hover/completion renderers — recorded as `P61-D1-002`.

**(5) An unresponsive peer.** Three thresholds exist, and one request class has no timeout at all:
- **Socket connect timeout: 10s** (`createSocket()`, `java-interop.ts:127-131`). At 9.999s nothing has happened; at 10.000s+ the socket is destroyed and the connect promise rejects with `'Socket connection to Java service timed out after 10s'`.
- **Per-request class-resolution timeout: a separate 10s `Promise.race`** in `getRawClass()` (`java-interop.ts:176-181`). A peer that completes the TCP handshake and then never answers a `getClassInfo` request costs the caller a further 10s beyond the connect cost before the race's timeout branch wins — and the underlying `connection.sendRequest(...)` promise, never cancelled, has no handler on its losing branch, an unhandled-rejection risk recorded as `P61-D2-002`.
- **No timeout at all:** `loadClasspath()` and `loadImplicitImports()` (`java-interop.ts:189-277`) send requests through the same `connection` with no timeout wrapper. A peer that accepts the connection and then never answers a `loadClasspath`/`getClassInfos`/`getTopLevelPackages` request hangs those calls indefinitely.
- Every class resolution — both the interactive lookups above and the `loadImplicitImports()` startup preload — additionally passes through the single global `acquireLock`/`lockQueue` mutex (`java-interop.ts:42-46`, `798-820`); a `depth === 0` call always mints a *new* lock token (`java-interop.ts:482`), so distinct top-level class names never re-enter and instead queue strictly behind one another. Against an unresponsive peer this means every unresolved reference on every keystroke pays its own full 10s connect-timeout serially, behind whichever resolution already holds the lock — recorded as `P61-D3-002` (high severity).
- Net cost of a peer that completes the TCP handshake and then never answers: at minimum, one unbounded `loadClasspath`/`getClassInfos` hang, or a serialized chain of 10s class-resolution timeouts, one per distinct unresolved class name in the open document.

**(6) Blast radius.** Confined to the language-server process's in-memory data model (`resolvedClasses`, `childrenOfByName`, the classpath AST document) and to whatever an IDE later renders from it (hover/completion markdown in `RU-61-04`). Nothing in these four files writes a peer-supplied value to the filesystem, builds a URI from peer-supplied data, or spawns a process from peer-supplied data — `lib/fs-provider.ts`'s `bbjlib` provider serves only its four hardcoded catalog paths regardless of the requested URI (`fs-provider.ts:27-35`), and `JavadocProvider` reads only from its own initialize-time `roots: URI[]` (supplied by the caller, not the peer) at `java-javadoc.ts:44-86`. The blast radius does not reach the IDE host process, the filesystem, or a spawned process from this unit's code alone.

`java-interop/` was read only far enough to establish the wire contract above (D-13); no finding is located there. One Java-side observation surfaced while reading it — the server accepts unlimited unauthenticated connections with no cap — and is recorded in `.planning/BACKLOG.md` under `FUT-01`, not here. Per D-13's accepted tradeoff, a reader of this file alone will not learn that observation exists.

### Findings

```
id:                P61-D1-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:116-120
dimension:         D1
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: setConnectionConfig(host, port) (java-interop.ts:116-120)
                    only guards against falsy values — `this.interopHost = host || '127.0.0.1'`
                    and `this.interopPort = port || 5008` — with no type check and no range
                    check. A non-integer, negative, out-of-range, or string-typed `port` (e.g.
                    NaN, -1, 99999, "evil.example.com:80") is stored as-is and reaches
                    `socket.connect(this.interopPort, this.interopHost)` (java-interop.ts:140)
                    unmodified. Both call sites feeding this method — bbj-ws-manager.ts:53-55
                    (initializationOptions.interopHost/interopPort) and main.ts:151-152
                    (config.interop?.host/port) — add no validation of their own (referred to
                    RU-61-05 below).
failure_scenario:  A workspace-scoped .vscode/settings.json committed inside a cloned repository
                    sets bbj.interop.host/bbj.interop.port to an attacker-controlled host/port.
                    Opening that workspace silently redirects every future Java-class lookup off
                    loopback to the attacker's listener, with no confirmation step visible in this
                    unit or its two call sites.
classification:    major
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with vitest: pass —
                    (5) reviewer can name the exact edit (add type/range validation in
                    setConnectionConfig): pass — (6) severity is `medium` but primary dimension
                    is D1: FAIL — test (6) fails on the D1 primary-dimension clause alone, so
                    classification is `major` regardless of the other five tests (D-13's safety
                    gate).
effort:            2
dedup:             none — none of the 15 frozen open issues concern the java-interop
                    connection-destination validation; #231 (custom classpath/CLI settings for
                    starting BBj programs) is the closest area match but concerns run-command
                    classpath/CLI args, not the interop client's host/port.
disposition:       major-refactor
```

```
id:                P61-D1-002
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:598-644
dimension:         D1
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: resolveClass() copies every peer-supplied field (fields,
                    methods, constructors, error, isDeprecated, parameter types/names) directly
                    onto the JavaClass AST node with no schema validation, size limit, or content
                    filtering (java-interop.ts:543-596). The hand-built method signature string
                    interpolates peer-supplied method.returnType/parameter types/names with no
                    escaping (java-interop.ts:632-637), and the resulting
                    DocumentationInfo.javadoc Markdown (java-interop.ts:638-643,
                    tryParseJavaDoc at 896-905) carries no length bound. Both values are stored
                    on the AST node returned to RU-61-04's hover/completion providers with no
                    further sanitization in this unit.
failure_scenario:  A malicious or compromised peer on interopHost:interopPort returns a
                    getClassInfo/getClassInfos response with an oversized or
                    Markdown-control-character-laden method.returnType, parameter name, or a
                    multi-megabyte doc string; the value flows unmodified into the IDE-rendered
                    hover/completion markdown built from this unit's output.
classification:    major
                    (1) touches ~2 files (validation helper alongside java-interop.ts): pass —
                    (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass —
                    (4) regression-testable with vitest: pass — (5) reviewer can name the exact
                    edit (validate/bound/escape before assignment): pass — (6) severity is
                    `medium` but primary dimension is D1: FAIL — `major` regardless (D-13).
effort:            4
dedup:             none — no frozen open issue addresses peer-response validation on the
                    java-interop channel.
disposition:       major-refactor
```

```
id:                P61-D2-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:91-108
dimension:         D2
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: connect() (java-interop.ts:91-108) checks
                    `if (this.connection) return this.connection;` with no in-flight guard — two
                    concurrent callers that both observe this.connection === undefined each call
                    createSocket() and each get their own live socket; the second assignment to
                    this.connection (line 106) silently overwrites and leaks the first.
                    Separately, once a connection is established, no 'error'/'close' listener is
                    attached to the connection or its socket (contrast with the listeners
                    registered only during the initial connect in createSocket(), lines 132-139)
                    — if the peer drops the socket after a successful connect, this.connection
                    still holds the dead reference, so the fast-path check at line 92 returns it
                    to every subsequent caller instead of reconnecting.
failure_scenario:  (a) Two Java-class lookups fire in the same tick while disconnected — each
                    opens its own socket, one is leaked. (b) The peer is killed mid-session —
                    every subsequent resolveClassByName call reuses the dead connection object
                    and its requests hang or reject with no recovery until clearCache() is called
                    explicitly.
classification:    easy
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with vitest (mock
                    socket): pass — (5) reviewer can name the exact edit (add an in-flight
                    connect promise + 'close'/'error' listeners clearing this.connection): pass —
                    (6) severity `medium`, primary dimension D2 (not D1): pass — all six pass,
                    classification is `easy`.
effort:            4
dedup:             none
disposition:       easy-fix
```

```
id:                P61-D2-002
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:176-181
dimension:         D2
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: getRawClass() (java-interop.ts:176-181) and
                    doResolveClassByName() (java-interop.ts:489-496) both wrap a request in
                    Promise.race([sendRequest(...), timeoutPromise]). When the timeout branch
                    wins, the underlying sendRequest(...) promise is not cancelled and keeps no
                    attached handler of its own; if it later rejects, that rejection is
                    unhandled — Promise.race does not attach a .catch to its losing branch.
failure_scenario:  A slow peer answers a getClassInfo request just after the 10s timeout has
                    already rejected the race; the late-settling sendRequest(...) promise then
                    rejects with no handler, surfacing as an unhandledRejection at the process
                    level.
classification:    easy
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with vitest: pass —
                    (5) reviewer can name the exact edit (attach a no-op .catch to the raced
                    promise): pass — (6) severity `medium`, dimension D2: pass — `easy`.
effort:            2
dedup:             none
disposition:       easy-fix
```

```
id:                P61-D2-003
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:576-585
dimension:         D2
secondary:         [D1]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: resolveClass()'s Phase 1 loops (java-interop.ts:576, 581)
                    iterate javaClass.fields/javaClass.methods with no null/undefined guard,
                    unlike classes/constructors, which are defensively defaulted with `??= []`
                    at java-interop.ts:561-562. The try that guards resolution errors
                    (java-interop.ts:598) wraps only the async Phase 2, not these synchronous
                    Phase 1 loops.
failure_scenario:  A malformed or malicious getClassInfo response with a missing/null fields or
                    methods array throws an uncaught TypeError: Cannot read properties of
                    undefined synchronously inside resolveClass(), propagating out of the
                    resolution chain uncaught.
classification:    easy
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with vitest: pass —
                    (5) reviewer can name the exact edit (`javaClass.fields ??= []` /
                    `javaClass.methods ??= []` alongside the existing classes/constructors
                    defaults): pass — (6) severity `medium`, primary dimension D2 (D1 is only
                    secondary): pass — `easy`.
effort:            2
dedup:             none
disposition:       easy-fix
```

```
id:                P61-D2-004
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:761-790
dimension:         D2
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: clearCache() (java-interop.ts:761-790) resets
                    _resolvedClasses, _pendingResolutions, childrenOfByName, JAVA_LANG_OBJECT,
                    the lock state, and the classpath document arrays, and disposes the
                    connection — but never resets completeClassIndex/completeIndexResolved (the
                    fields backing ensureCompleteClassIndex(), java-interop.ts:283-285), even
                    though clearCompleteClassIndex() (java-interop.ts:322-325) exists
                    specifically to do so and is never called from clearCache().
failure_scenario:  The classpath is reloaded via main.ts's didChangeConfiguration path
                    (clearCache() then loadClasspath()); the stale completeClassIndex built for
                    the previous classpath survives and continues to answer
                    resolveClassCandidatesBySimpleName/findClassCandidatesByPrefix auto-import
                    suggestions with FQNs from the old classpath instead of the new one.
classification:    easy
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with vitest: pass —
                    (5) reviewer can name the exact edit (call this.clearCompleteClassIndex()
                    inside clearCache()): pass — (6) severity `low`, dimension D2: pass —
                    `easy`.
effort:            2
dedup:             none
disposition:       easy-fix
```

```
id:                P61-D3-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:40-48
dimension:         D3
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: _resolvedClasses, childrenOfByName, and
                    _pendingResolutions (java-interop.ts:40-48) are plain Maps with no eviction
                    policy, size cap, or LRU behavior anywhere in this file; entries accumulate
                    for the lifetime of the language-server process.
failure_scenario:  A long-running editor session against a large/varied classpath (many `use`d
                    packages over time) grows these maps without bound, increasing steady-state
                    memory usage monotonically until the server is restarted.
classification:    easy
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with vitest: pass —
                    (5) reviewer can name the exact edit (bound _resolvedClasses with an
                    LRU/size cap): pass — (6) severity `low`, dimension D3: pass — `easy`.
effort:            4
dedup:             none
disposition:       easy-fix
```

```
id:                P61-D3-002
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:42-46, 798-820
dimension:         D3
secondary:         []
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace: resolveClassByName() acquires acquireLock
                    (java-interop.ts:483, defined 798-820) before any network call, and every
                    depth === 0 (top-level) call mints a brand-new lock token
                    (`depth === 0 ? {} : ...`, java-interop.ts:482) rather than sharing one
                    across distinct class names — so resolutions of different class names never
                    re-enter, they queue strictly behind each other on the single
                    lockQueue/lockHeld mutex (java-interop.ts:42-46). Against an unreachable
                    peer, each queued resolution independently pays the full 10s createSocket()
                    connect timeout (java-interop.ts:127-131) before failing and releasing the
                    lock to the next. loadImplicitImports() (java-interop.ts:213-277) fires its
                    per-class resolveClass() calls via Promise.all, but every one of them still
                    serializes through this same lock.
failure_scenario:  With the peer unreachable, a document containing N distinct unresolved Java
                    class references triggers N serialized ~10s connect-timeout attempts
                    (~10xN seconds) before validation completes, rather than failing once and
                    short-circuiting the rest; the same serialization governs the startup
                    loadImplicitImports() preload across the 8 implicit packages' full
                    member-type graph.
classification:    major
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with vitest: pass —
                    (5) reviewer can name the exact edit (a peer-reachability circuit breaker
                    that short-circuits further connect attempts after the first failure, reset
                    on clearCache()): pass — (6) severity `high`: FAIL — `major` regardless of
                    the other five tests (D-13's safety gate).
effort:            8
dedup:             none — none of the 15 frozen open issues concern java-interop
                    connection-retry behavior; #232 (CPU stability in multi-project workspaces,
                    routed to RU-61-02) is a different mechanism (scope walks, not connection
                    serialization).
disposition:       major-refactor
```

```
id:                P61-D4-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:37-831
dimension:         D4
secondary:         []
severity:          medium
evidence_tier:     trace
evidence:          Trace: the single class JavaInteropService (java-interop.ts:37-831, 955
                    lines total in the file) bundles at least 5 distinct responsibilities:
                    connection lifecycle (connect/createSocket, 91-142), class
                    resolution/caching (resolveClassByName/resolveClass/storeJavaClass,
                    430-755), the global resolution lock (acquireLock/drainLockQueue,
                    792-830), classpath/implicit-import loading (loadClasspath/
                    loadImplicitImports, 189-277), and the complete-class-index builder
                    (ensureCompleteClassIndex/buildCompleteClassIndex, 283-348). No internal
                    module boundary separates them.
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a
                    runtime failure): a change to any one responsibility (e.g. the lock, or
                    the class-index cache) risks touching unrelated state in the same class,
                    and a new contributor cannot reason about one responsibility (e.g.
                    connection lifecycle) without reading the whole 955-line file.
classification:    major
                    (1) touches 1 file: FAIL — a responsibility split necessarily creates or
                    touches more than one file — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with vitest: pass —
                    (5) reviewer can name the exact edit (extract the lock and the
                    complete-class-index builder into their own modules): pass — (6) severity
                    `medium`, dimension D4: pass — but test (1) already fails, so
                    classification is `major`.
effort:            8
dedup:             none
disposition:       major-refactor
```

```
id:                P61-D4-002
unit:              RU-61-06
location:          bbj-vscode/src/language/java-javadoc.ts:16-36
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Trace: JavadocProvider (java-javadoc.ts:16-36) is a hard singleton — a
                    private constructor plus a static `getInstance()` — rather than an
                    injected DI service. test/bbj-test-module.ts:52-54 works around this by
                    checking `isInitialized()` before calling `initialize()` a second time,
                    instead of receiving a fresh instance per test, which is the pattern every
                    other collaborator in this unit uses (JavaInteropService itself is
                    constructor-injected via BBjServices).
failure_scenario:  n/a (D4 trace-tier finding): the singleton's module-level static state
                    persists across the process lifetime (and across unrelated test files
                    sharing the same vitest worker, unless carefully guarded by
                    `isInitialized()` checks as the test double already does), making the
                    provider harder to reset, mock, or run with two independent
                    configurations in the same process than an injected service would be.
classification:    major
                    (1) touches 1 file: FAIL — removing the singleton also touches
                    bbj-module.ts's DI wiring — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with vitest: pass —
                    (5) reviewer can name the exact edit (inject JavadocProvider via
                    BBjServices instead of getInstance()): pass — (6) severity `low`,
                    dimension D4: pass — but test (1) already fails, so classification is
                    `major`.
effort:            8
dedup:             none
disposition:       major-refactor
```

```
id:                P61-D4-003
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:175-314
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Trace: getRawClass (175-181), loadClasspath (189-206),
                    loadImplicitImports (213-277), and ensureCompleteClassIndex (294-314)
                    each independently call `await this.connect()` and then
                    `connection.sendRequest(...)` inside their own try/catch, with similar
                    but not identical error handling (some catch-and-return-false, one
                    distinguishes METHOD_NOT_FOUND specially) and no shared helper for the
                    connect+send+catch shape.
failure_scenario:  n/a (D4 trace-tier finding): a change to the shared connect+send+catch
                    shape (e.g. adding a retry, or the circuit breaker recommended by
                    P61-D3-002) must be applied in up to 4 places by hand, risking drift
                    between them.
classification:    easy
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with vitest: pass —
                    (5) reviewer can name the exact edit (extract a private
                    `sendRequestSafe(request, params, fallback)` helper): pass — (6) severity
                    `low`, dimension D4: pass — `easy`.
effort:            4
dedup:             none
disposition:       easy-fix
```

```
id:                P61-D5-001
unit:              RU-61-06
location:          bbj-vscode/test/linking.test.ts:295-450
dimension:         D5
secondary:         [D2]
severity:          medium
evidence_tier:     inherited
evidence:          Per INVENTORY.md's Test & Build Baseline (§"Every failing test"): all 11
                    tests inside `describe.runIf(isInteropRunning)("Interop related tests", ...)`
                    (test/linking.test.ts:295-450) fail deterministically across repeated
                    `npm test` runs — "All BBj classes extends Object", "Import and declare
                    simple Java class without using FQNs", "Import Java class", "Declare with
                    direct import", "Class definition with direct import in extends", "Class
                    definition with direct import in implements", "Unloaded Java FQN access -
                    test for #6", "Java FQN access - test for #6", "Linked List is resolved",
                    "Resolve nested class in use statement", "Resolve nested class FQN" — each
                    failing with an unresolved-reference error (`NamedElement`,
                    `JavaPackageLike`, etc.) traced to `stderr: "No bbjdir set. No classpath
                    and prefixes loaded."`. Confirmed independently in this sweep: the gate
                    (`shouldRunBBjTests()`, test/test-helper.ts:38-43) defaults to
                    `isPortOpen(5008)`; in this sandbox `isPortOpen(5008)` returns true (a
                    listener answers on :5008), so the `describe.runIf` gate lets the suite
                    run rather than skip — yet the 11 tests still fail, because whatever
                    answers on :5008 is not a real BBj backend with a loaded classpath/bbjdir.
                    This confirms INVENTORY's established fact from the client side: bringing
                    a listener up on port 5008 alone does not fix these failures.
failure_scenario:  Any of the 11 named tests, run against this sandbox's current environment
                    (or any environment without a real `bbjdir`-configured BBj backend behind
                    :5008), fails on an unresolved Java class/package reference rather than
                    passing or being skipped.
classification:    major
                    (1) touches 1 file: n/a — this is an environment/test-infrastructure gap,
                    not a code edit — (2) no public API/grammar/LSP change: n/a —
                    (3) no new dependency: n/a — (4) regression-testable with vitest: n/a,
                    already a vitest suite — (5) reviewer can name the exact edit: n/a, no
                    single code edit fixes an environment dependency — (6) severity `medium`,
                    primary dimension D5 (not D1): the six D-13 tests are built for
                    code-fix findings; this is an environment/infrastructure gap that Phase 66
                    re-triages rather than a fix this milestone applies, so `classification` is
                    recorded as `major` conservatively (routed for triage, not accepted as an
                    allowlisted known-failure per D-14/D-06).
effort:            8
dedup:             none — no frozen open issue matches; no DEBT-01..06 item names this
                    specific test gap (DEBT-02 covers the 3 disabled parser.test.ts
                    assertions and the TEST-03 completion-test.test.ts skip only, not
                    test/linking.test.ts's "Interop related tests"). Phase 66 should triage
                    this as a new debt item — e.g. a CI-safe mock interop backend that
                    answers with a real classpath, or documenting these as
                    RUN_BBJ_TESTS-gated local-only tests with the current environment
                    behavior (port-open-but-no-bbjdir) called out explicitly.
disposition:       major-refactor
```

```
id:                P61-D5-002
unit:              RU-61-06
location:          bbj-vscode/test/bbj-test-module.ts:108-123
dimension:         D5
secondary:         []
severity:          medium
evidence_tier:     trace
evidence:          Trace: JavaInteropTestService (test/bbj-test-module.ts:47-138), the
                    double every non-"Interop related" unit test in this repo runs against,
                    overrides connect() to always reject (108-110), loadClasspath() to
                    return false (112-114), loadImplicitImports() to return false (116-118),
                    and resolveClassByName() to resolve from a preloaded map or a synthetic
                    stub, never calling the base resolveClass() (120-123). None of the real
                    connection-lifecycle code (P61-D2-001), the Promise.race timeout pattern
                    (P61-D2-002), the fields/methods undefined-guard gap (P61-D2-003), the
                    completeClassIndex reset gap (P61-D2-004), or the global-lock
                    serialization (P61-D3-002) is reachable through this double. The only
                    tests that exercise the real code paths are test/linking.test.ts's
                    "Interop related tests" and the two functional
                    *-real-interop.test.ts files, all gated on a live interop service and,
                    per P61-D5-001, currently failing/environment-blocked.
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): any
                    regression in connection lifecycle, timeout handling, malformed-response
                    handling, or lock serialization in java-interop.ts would pass the full
                    `npm test` suite undetected, because no currently-passing test exercises
                    those code paths.
classification:    major
                    (1) touches 1 file: n/a — closing this gap requires new test
                    infrastructure (a controllable fake socket peer), not a single-file
                    code edit — (2)-(5): n/a for the same reason — (6) severity `medium`,
                    dimension D5: the gap spans multiple defects and needs dedicated test
                    infrastructure, so `classification` is recorded as `major`.
effort:            8
dedup:             none — no frozen open issue addresses java-interop.ts unit-test coverage
                    for its connection/timeout/lock code paths.
disposition:       major-refactor
```

```
id:                P61-D8-001
unit:              RU-61-06
location:          bbj-vscode/src/language/java-interop.ts:757-760
dimension:         D8
secondary:         [D2]
severity:          low
evidence_tier:     trace
evidence:          Trace: clearCache()'s doc comment (java-interop.ts:757-760) reads "Clears
                    all cached Java class data, disconnects the current connection, and
                    resets the classpath document." The method (761-790) does not reset
                    completeClassIndex/completeIndexResolved (same underlying gap as
                    P61-D2-004), so the comment's "all cached" claim is inaccurate for that
                    field.
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a
                    runtime failure): a reader of clearCache()'s doc comment reasonably
                    concludes calling it leaves no stale cached state, which is false for the
                    complete class index.
classification:    easy
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with vitest: pass —
                    (5) reviewer can name the exact edit (fix the comment, or fix the code per
                    P61-D2-004 so the comment becomes true): pass — (6) severity `low`,
                    primary dimension D8 (D2 is only secondary): pass — `easy`.
effort:            2
dedup:             none
disposition:       easy-fix
```

### Not-reproducible dispositions

- **Tier failed: `repro` (D1).** Candidate claim: unescaped Markdown/HTML syntax in peer-supplied Javadoc text (`java-interop.ts:638-643`) achieves script injection in the rendered hover/completion UI. **Reason not recorded as a finding:** confirming this requires the renderer's `MarkupKind`/`supportHtml` configuration, which lives in `RU-61-04` (`bbj-hover.ts`, `bbj-completion-provider.ts`) — outside this unit's files and out of scope for a `RU-61-06` sweep. The unbounded/unescaped *content* flowing into `DocumentationInfo.javadoc` is still recorded as `P61-D1-002`; the stronger claim of confirmed HTML/script execution in the IDE is not asserted without that additional evidence, which `RU-61-04`'s own sweep is positioned to supply.
- **Tier failed: `trace` (D8).** Candidate claim: the JSDoc on `resolveClassCandidatesBySimpleName` (java-interop.ts:350-356) characterizing its fallback package probe as "cheap" may understate its actual cost, given `autoImportCandidatePackages` has 10 entries each triggering a `resolveClassByName` call that now recurses through the single global lock documented in `P61-D3-002`. **Reason not recorded as a finding:** confirming or refuting "cheap" requires a runtime latency measurement, outside this review's read-only sweep. The fallback's structural mechanism is already fully captured by `P61-D3-002`; no additional D8 finding is recorded without that measurement.

### Cross-unit referrals

- **RU-61-05** — `bbj-ws-manager.ts:53-55` and `main.ts:151-152` supply `interopHost`/`interopPort` from `initializationOptions`/`didChangeConfiguration` with only a falsy-check default (`|| 'localhost'`, `|| 5008`), the same gap this unit's `setConnectionConfig` (`java-interop.ts:116-120`, `P61-D1-001`) does not close. `RU-61-05`'s own D1/D2 sweep should confirm whether either call site adds validation this unit does not see, or record its own finding if not.
- **RU-61-02** — the 11 `test/linking.test.ts` "Interop related tests" failures (`P61-D5-001` above) are recorded here as already-owned: their *subject* is the linker (`RU-61-02` resolves `NamedElement`/`JavaPackageLike` references), but their *cause* is this unit's unreachable/non-functional peer, per D-06's routing table and the finding-ownership rule ("a finding's `location:` decides which unit owns it, not which unit discovered it"). `RU-61-02` (plan `61-04`) must not re-record this item.

## RU-61-01 — Grammar & lexing

**Files (5 / 1,340 LOC):**
- `bbj-vscode/src/language/bbj.langium` (1,036)
- `bbj-vscode/src/language/java-types.langium` (68)
- `bbj-vscode/src/language/bbj-lexer.ts` (37)
- `bbj-vscode/src/language/bbj-token-builder.ts` (182)
- `bbj-vscode/src/language/bbj-value-converter.ts` (17)

**Risk rank:** 2 of 7 Phase 61 units — every other unit in this phase, and every downstream consumer in Phases 62-63, depends on this grammar/lexer pipeline.
**Sweep method (D-08):** full read.
**Owning plan:** 61-02.

### Cells
- D1 Security — pass — Checked every terminal regex in bbj.langium (COMMENT, BBjFilePath, ID, ID_WITH_SUFFIX, NUMBER, STRING_LITERAL, HEX_STRING, MNEMONIC, DOCU) and every custom pattern bbj-token-builder.ts constructs (ASTERISK_STANDALONE/EXPRESSION, RELEASE_NL/NO_NL, EXIT_NO_NL, RPAREN_NL, START_BREAK, FNEND, NEXT_BREAK/NEXT_ID, METHODRET_END, ENDLINE_PRINT_COMMA, PRINT_STANDALONE_NL, KEYWORD_STANDALONE) for catastrophic-backtracking shapes — nested quantifiers, overlapping alternation inside a repeated group, unanchored greedy `.*` inside a repeated group — none found (STRING_LITERAL's `([^"]|"{2})*` alternates over disjoint, fixed-length branches with no partition ambiguity; DOCU's lazy `[\s\S]*?` is a single unnested quantifier); checked bbj-lexer.ts's prepareLineSplitter for unbounded memory/token growth on a pathological input (linear — see D3); checked bbj-value-converter.ts for any evaluation, unescaping, or interpolation of input (none — it only slices delimiter characters; see P61-D2-005 for a related but distinct correctness gap in that slicing); checked whether java-types.langium accepts type text originating from the java-interop peer — it declares only AST type-shape interfaces with no parsing/validation logic of its own, so the actual unvalidated peer-data assignment lives in RU-61-06's java-interop.ts (already recorded there as P61-D1-002, see Cross-unit referrals below); no independent D1 finding recorded here. One D1-adjacent candidate considered and not promoted — see Not-reproducible dispositions.
- D2 Correctness & error handling — fail — Checked the line-continuation splitter for off-by-one behavior at CRLF vs. LF line endings by tracing bbj-lexer.ts:11's `windowsEol` detection against a mixed-EOL reproduction (found P61-D2-006); checked STRING_LITERAL's doubled-quote escape handling against bbj.langium:948's comment claim by tracing bbj-value-converter.ts:14 (found P61-D2-005, cross-ref P61-D8-002); checked bbj.langium:941's BBjFilePath terminal for tokenization-boundary correctness across multiple qualified references on one physical line (found P61-D2-007); checked bbj-token-builder.ts for errors caught-and-discarded rather than surfaced (found P61-D2-008's silent-wrong-removal-on-missing-name gap in spliceToken); checked bbj-value-converter.ts's ID/STRING_LITERAL cases and HEX_STRING's default pass-through for null/undefined propagation on values the grammar permits — none found, ID always has length >= 1 given its terminal pattern. 4 findings recorded: P61-D2-005, P61-D2-006, P61-D2-007, P61-D2-008.
- D3 Performance & resource use — pass — Checked whether bbj-token-builder.ts's regexes are compiled once or rebuilt per call: buildTokens()/buildTerminalToken() run once per grammar/services initialization (Langium invokes the token builder when creating BBjServices), not per document parse or per keystroke, so no per-call regex-recompilation cost exists on the hot path; checked bbj-lexer.ts's prepareLineSplitter for linear-vs-quadratic behavior in line count and continuation-run length by re-implementing the algorithm and benchmarking synthetic inputs from 2,000 to 160,000 lines split across many independent 2-line continuation groups — runtime scaled linearly (e.g. 80,000 lines: 74.6ms vs. 160,000 lines: 138.3ms, roughly 2x for 2x input), confirming that splice's equal insert/delete count here performs an in-place slot replacement rather than an O(n) tail shift; checked whether any grammar construct forces backtracking proportional to file size — the expression-precedence chain (BinaryExpression/RelationalExpr/AdditiveExpr/MultiplicativeExpr/ExponentiationExpr/PrefixExpression) and MemberCall's repeated-alternation loop are ordinary LL(k) predictive constructs, and v3.3 already established all 47 Chevrotain ambiguities in this grammar resolve correctly (out-of-scope to re-litigate per REQUIREMENTS.md's Out of Scope table). No D3 finding recorded.
- D4 Maintainability & code smells — fail — Checked rule duplication inside bbj.langium at 1,036 lines: WithChannelAndOptionsAndOutputItems (line 513) and WithChannelAndOptionsAndInputItems (line 614) are near-identical fragments differing only by OutputItem/InputItem and one extra alternative (found P61-D4-004); checked overlap between bbj.langium and java-types.langium — no duplication found, java-types.langium declares only the JavaClass/JavaField/JavaMethod AST interfaces with no grammar-rule counterpart in bbj.langium; checked grammar rules for unreachable references by confirming every SingleStatement/ClassMember/LibMember alternative is referenced from its parent rule — no concretely unreachable rule found, though exhaustive call-graph verification was not performed (see Not-reproducible dispositions); checked whether bbj-value-converter.ts (17 lines) and bbj-lexer.ts (37 lines) are coherent modules or fragments of bbj-token-builder.ts — each maps to a distinct Langium DI service hook (ValueConverter vs. Lexer vs. TokenBuilder) with a single clear responsibility, the same reasoning RU-61-06 applied to bbj-api.ts's 12 lines, so no defect; checked bbj-token-builder.ts's buildTokens() for responsibility bundling (found P61-D4-005). 2 findings recorded: P61-D4-004, P61-D4-005.
- D5 Test coverage gaps — fail — This unit owns the routing table's 3 disabled test/parser.test.ts assertions ('Check substring other cases', 'Release usage', and the OutputHandler class-field test), each blocked on a Java classpath unavailable under EmptyFileSystem; recorded with full evidence as P61-D5-003, dedup naming DEBT-02 as the owning requirement per D-14. Also checked whether test/functional/chevrotain-tokens.test.ts covers the token-builder branches D2 flagged: it exercises only the single KEYWORD_STANDALONE terminal (via its 7 describe blocks for READ/INPUT/ENTER/EXTRACT/DELETE/SAVE/FIND, all matched by that one terminal's alternation), leaving bbj-token-builder.ts's other 13 custom buildTerminalToken branches (ASTERISK_STANDALONE/EXPRESSION, RELEASE_NL/NO_NL, EXIT_NO_NL, RPAREN_NL, START_BREAK, FNEND, NEXT_BREAK/NEXT_ID, METHODRET_END, ENDLINE_PRINT_COMMA, PRINT_STANDALONE_NL) without an equivalent focused runtime-verification test — noted as context, not filed as a second overlapping finding; checked whether example-files.test.ts's corpus exercises line continuation and CRLF inputs — it does not (the single test-data file, class-def.bbj, contains neither), and separately its `.forEach(async ...)` loop doesn't await its own assertions, so a future non-parsing file added there would not fail the test (found P61-D5-004, cross-ref P61-D8's CLAUDE.md guarantee). Per the plan's explicit instruction, the beforeAll WorkspaceManager.initializeWorkspace() hookTimeout flakiness that intermittently strikes this unit's own chevrotain-tokens.test.ts suite is not recorded here — see Cross-unit referrals (owned by RU-61-05). 2 findings recorded: P61-D5-003, P61-D5-004.
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — n/a — "This code is part of the single language-server binary (`out/language/main.cjs`) loaded identically by both VS Code and IntelliJ via LSP4IJ; there is no second, divergent implementation to compare it against, so no cross-IDE parity finding is obtainable here."
- D8 Comment & doc accuracy — fail — Checked every comment in the five target files against what the code does, including bbj.langium:948's STRING_LITERAL comment ("Handled in BBjValueConverter"), which is inaccurate — the converter never collapses `""` (found P61-D8-002, same underlying defect as P61-D2-005 viewed from the doc-accuracy angle); checked CLAUDE.md's §Architecture Langium-pipeline description and its specific claim that bbj-lexer.ts is "a custom lexer with line-continuation handling (prepareLineSplitter)" — accurate, matches the code read in this sweep; checked the `npm run langium:generate` instruction against bbj.langium's role as the grammar source for src/language/generated/ — accurate; checked CLAUDE.md's claim that every .bbj file in test/test-data/ must produce zero lexer/parser errors — currently true in practice (the sole test-data file parses cleanly, confirmed by running `npx vitest run test/example-files.test.ts`), but the test enforcing that guarantee has the coverage gap recorded as P61-D5-004, so the guarantee is not actually mechanically enforced against a future regression; every other inline comment read across bbj-token-builder.ts, bbj-lexer.ts, bbj-value-converter.ts and java-types.langium (suffix-character notes, EXIT_NO_NL's lookahead-restriction rationale, NEXT_BREAK's `*next` exclusion note, DEF FN's `void`-as-FeatureName rationale referencing #439) matched the code exactly. 1 finding recorded: P61-D8-002.

### Findings

```
id:                P61-D2-005
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj-value-converter.ts:14
dimension:         D2
secondary:         [D8]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace, confirmed with a standalone reproduction of the exact
                   logic: the STRING_LITERAL case in runConverter()
                   (bbj-value-converter.ts:14) is `return input.slice(1, -1);` — it strips
                   only the outer quote delimiters. The terminal's own comment
                   (bbj.langium:948) documents the intended contract: `"" escapse " inside a
                   string ... Handled in BBjValueConverter`. Reproduction: for source text
                   `"He said ""hi"""`, the STRING_LITERAL terminal (bbj.langium:949,
                   `"([^"]|"{2})*"`) matches the full `"He said ""hi"""`, and `input.slice(1,
                   -1)` yields `He said ""hi""` — the doubled quotes are never collapsed to a
                   single embedded `"`. No `.replace(/""/g, '"')` or equivalent exists
                   anywhere in this file.
failure_scenario:  A BBj source string literal containing a doubled-quote escape (e.g. `"He
                   said ""hi"""`) parses without error, but StringLiteral.value retains the
                   literal `""` sequence instead of the single embedded `"` the language's own
                   escape convention specifies, so every consumer of `.value` — including
                   RU-61-03's bbj-validator.ts:419 file-path resolution (`let cleanPath =
                   fileid.value`), which would mis-resolve a path containing an escaped quote
                   — sees a semantically wrong string.
classification:    easy
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3)
                   no new dependency: pass — (4) regression-testable with vitest: pass — (5)
                   reviewer can name the exact edit (`input.slice(1, -1).replace(/""/g,
                   '"')`): pass — (6) severity `medium`, primary dimension D2 (D8 only
                   secondary): pass — all six pass, classification is `easy`.
effort:            2
dedup:             none — checked against #83 (project-wide USE-statement scoping, unrelated),
                   #90 (per-file linking opt-out, unrelated) and #381 (config.bbx TextMate
                   highlighting regression, a different subsystem reviewed by `RU-62-05`) as
                   the plausible neighbours; no frozen open issue concerns string-literal
                   escape conversion.
disposition:       easy-fix
```

```
id:                P61-D2-006
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj-lexer.ts:11-34
dimension:         D2
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Runnable reproduction of prepareLineSplitter's logic against a mixed-EOL
                   input: for text `"PRINT 1\r\nPRINT 2\nPRINT \"After\"\n"` (31 chars, one
                   CRLF line followed by two LF lines), `windowsEol = text.includes('\r\n')`
                   (bbj-lexer.ts:11) evaluates true, so every line is rejoined with `'\r\n'`
                   (bbj-lexer.ts:33) regardless of that line's original ending. The
                   transformed text grows to 35 chars, and the offset of `PRINT "After"`
                   shifts from 17 in the original text to 18 in the transformed text — a
                   1-character drift per normalized LF-only line. lexer.test.ts's own
                   'preserve offset with empty line' test (test/lexer.test.ts:32-51) proves
                   length-preservation is this function's designed invariant for the
                   single-EOL-style case it covers; no test exercises a file with genuinely
                   mixed \r\n/\n endings.
failure_scenario:  A .bbj file containing mixed line endings (at least one \r\n line and at
                   least one bare \n line — plausible when a repository lacks .gitattributes
                   EOL normalization, or a file is edited across Windows/Unix tooling) is
                   retokenized by BbjLexer.tokenize; prepareLineSplitter's uniform-EOL
                   normalization changes the transformed text's length relative to the
                   original document text. Every token offset computed against the transformed
                   text from the first drifted line onward no longer matches the corresponding
                   offset in the original document text that the LSP layer maps positions
                   against, so diagnostics, hover, completion and go-to-definition ranges are
                   silently shifted for the remainder of the file.
classification:    easy
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3)
                   no new dependency: pass — (4) regression-testable with vitest, following
                   the exact pattern already used by lexer.test.ts: pass — (5) reviewer can
                   name the exact edit (track and re-emit each line's own original EOL instead
                   of a single detected `eol`, or reject/normalize before this function runs
                   in a length-preserving way): pass — (6) severity `medium`, dimension D2:
                   pass — all six pass, classification is `easy`.
effort:            4
dedup:             none — no frozen open issue concerns mixed line-ending handling in the lexer.
disposition:       easy-fix
```

```
id:                P61-D2-007
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj.langium:941
dimension:         D2
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Regex reproduction of the BBjFilePath terminal (`/::.*::/`,
                   bbj.langium:941): for input `"::lib1::ClassA a; declare ::lib2::ClassB b"`,
                   `"::lib1::ClassA a; declare ::lib2::ClassB b".match(/::.*::/)[0]` returns
                   `"::lib1::ClassA a; declare ::lib2::"` — the greedy `.*` backtracks from
                   the end of the line to the LAST `::` occurrence rather than the nearest
                   one, consuming a second, independent `declare ::lib2::...` statement into
                   the first token. `QualifiedBBjClassName` (bbj.langium:869-870, `BBjFilePath
                   ID`) feeds `BBjTypeRef`/`Use`, both reachable inside a `;`-separated
                   compound `Statement` (bbj.langium:22-23), so two BBjFilePath-qualified
                   references can legally appear on one physical line.
failure_scenario:  A line containing two independent qualified-file-path class references
                   joined by `;` — e.g. `declare ::lib1::ClassA a; declare ::lib2::ClassB b` —
                   tokenizes the first BBjFilePath as spanning through the second
                   declaration's opening `::`, corrupting the parse of both statements (the
                   second `declare` loses its own file-path token, and the first's `ID`
                   production is fed garbled trailing text).
classification:    major
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: FAIL — the
                   fix edits the BBjFilePath terminal, a rule in
                   bbj-vscode/src/language/bbj.langium — (3) no new dependency: pass — (4)
                   regression-testable with vitest: pass — (5) reviewer can name the exact
                   edit (e.g. `/::[^:]*(:[^:][^:]*)*::/` or an explicit
                   non-greedy/negated-character-class rewrite, verified against legitimate
                   paths containing single colons): pass — (6) severity `medium`, dimension
                   D2: pass — but test (2) already fails, so classification is `major`
                   regardless of the other five tests (D-13's safety gate).
effort:            4
dedup:             none — no frozen open issue concerns BBjFilePath tokenization.
disposition:       major-refactor
```

```
id:                P61-D2-008
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj-token-builder.ts:67-71
dimension:         D2
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          Reproduction of Array.prototype.splice(-1, 1) semantics against
                   spliceToken()'s exact shape: for `tokens =
                   [{name:"A"},{name:"B"},{name:"C"}]` and a sought `name` absent from the
                   array, `tokens.findIndex(...)` (bbj-token-builder.ts:68) returns `-1`, and
                   `tokens.splice(-1, 1)[0]` (line 69) removes `{name:"C"}` — the LAST element
                   — instead of throwing or being a no-op. spliceToken is called 14 times
                   (lines 21-34) with hardcoded terminal names (START_BREAK, FNEND,
                   NEXT_BREAK, NEXT_ID, METHODRET_END, ENDLINE_PRINT_COMMA,
                   KEYWORD_STANDALONE, PRINT_STANDALONE_NL, RPAREN_NL, ASTERISK_EXPRESSION,
                   ASTERISK_STANDALONE, RELEASE_NL, RELEASE_NO_NL, EXIT_NO_NL), none of which
                   currently guards the lookup result.
failure_scenario:  If any of the 14 hardcoded terminal names passed to spliceToken becomes
                   absent from `tokens` — e.g. a future grammar edit renames or removes
                   RPAREN_NL — findIndex returns -1 and `tokens.splice(-1, 1)` silently
                   removes and re-splices the unrelated LAST token in the vocabulary array
                   instead of raising an error, corrupting Chevrotain's token-priority
                   ordering with no diagnostic message; the failure would surface later as a
                   confusing, hard-to-trace lexer misbehavior rather than at the point of the
                   misconfiguration.
classification:    easy
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3)
                   no new dependency: pass — (4) regression-testable with vitest (call
                   buildTokens with a token vocabulary missing one of the 14 names and assert
                   a thrown error): pass — (5) reviewer can name the exact edit (throw when
                   `nextTokenIndex === -1` before splicing): pass — (6) severity `low`,
                   dimension D2: pass — all six pass, classification is `easy`.
effort:            2
dedup:             none
disposition:       easy-fix
```

```
id:                P61-D4-004
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj.langium:513-521,614-617
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Trace: fragment WithChannelAndOptionsAndOutputItems (bbj.langium:513-521)
                   and fragment WithChannelAndOptionsAndInputItems (bbj.langium:614-617) share
                   the identical `'(' channelno=Expression? Options? (...)` opening shape and
                   the identical bare-items-list closing alternative, differing only in
                   OutputItem vs. InputItem and one extra alternative the Output variant
                   carries (`RPAREN_NO_NL ENDLINE_PRINT_COMMA` with no items) that the Input
                   variant lacks — already a visible drift between the two near-duplicates.
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a
                   runtime failure): a future change to the shared channel/options/RPAREN
                   opening shape (e.g. adding a new Options variant) must be applied by hand
                   in both fragments, and the two are already inconsistent (the extra
                   Output-only alternative), so a change is likely to be applied to only one.
classification:    major
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: FAIL —
                   de-duplicating necessarily edits both fragments' rule text in
                   bbj-vscode/src/language/bbj.langium — (3) no new dependency: pass — (4)
                   regression-testable with vitest: pass — (5) reviewer can name the exact
                   edit (extract a shared `WithChannelAndOptionsAndItems<Item>`-style common
                   prefix fragment, or a documented rationale for why the extra Output-only
                   alternative must stay asymmetric): pass — (6) severity `low`, dimension D4:
                   pass — but test (2) already fails, so classification is `major`.
effort:            4
dedup:             none
disposition:       major-refactor
```

```
id:                P61-D4-005
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj-token-builder.ts:7-64
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Trace: buildTokens() (bbj-token-builder.ts:7-64, 58 lines) bundles at least
                   3 distinct responsibilities with no internal decomposition:
                   terminal/keyword token construction and whitespace-priority ordering (lines
                   8-19), 14 hardcoded sequential spliceToken priority-reordering calls (lines
                   21-34), and ID/ID_WITH_SUFFIX CATEGORIES/LONGER_ALT wiring across a loop
                   plus 3 special-cased terminals (lines 36-62) — all three phases read and
                   mutate the same shared `tokens` array in sequence within one method.
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a
                   runtime failure): a future change to token priority ordering (the
                   spliceToken block) risks an accidental edit inside the unrelated
                   ID-category-wiring block, since both operate on the same local `tokens`
                   variable with no named boundary between them.
classification:    easy
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3)
                   no new dependency: pass — (4) regression-testable with vitest, using the
                   existing token-vocabulary assertions in
                   lexer.test.ts/chevrotain-tokens.test.ts as a regression baseline: pass —
                   (5) reviewer can name the exact edit (extract
                   `reorderTokenPriorities(tokens)` and `wireIdCategories(tokens,
                   terminalTokens)` as private helpers called from buildTokens): pass — (6)
                   severity `low`, dimension D4: pass — all six pass, classification is
                   `easy`.
effort:            4
dedup:             none
disposition:       easy-fix
```

```
id:                P61-D5-003
unit:              RU-61-01
location:          bbj-vscode/test/parser.test.ts:530-533,811-815,860-864
dimension:         D5
secondary:         [D2]
severity:          medium
evidence_tier:     inherited
evidence:          Trace of the 3 disabled assertions, per the routing table (D-06) item this
                   unit owns: (1) 'Check substring other cases' (test/parser.test.ts:525-534)
                   parses `new String()(1)` and disables `expectNoValidationErrors` at line
                   533 with the comment "'String' is a Java class that cannot be resolved in
                   EmptyFileSystem test context"; (2) 'Release usage' (lines 805-816) parses a
                   `BBjAPI().getGlobalNamespace().getValue()` / `.release()` chain and
                   disables the same assertion at line 815, noting "the synthetic BBjAPI stub
                   in bbj-api.ts has no methods"; (3) the OutputHandler class-field test
                   (lines 845-865) declares `field protected String[] strings` and `method
                   public String[] createHTML(byte[] bytes)` and disables validation at line
                   864, noting `String`/`byte` array-typed members need Java classpath
                   resolution. All three are commented-out `expectNoValidationErrors(result)`
                   calls, not `test.skip`, matching INVENTORY's Test & Build Baseline
                   description exactly.
failure_scenario:  Any regression in Java-classpath-dependent validation for these three
                   scenarios — new String() substring validation, BBjAPI() global-namespace
                   method-chain resolution, and String[]/byte[] Java-typed class fields —
                   would pass the full npm test suite undetected, because the only assertions
                   that would catch it are commented out rather than executed.
classification:    major
                   (1) touches 1 file: n/a — this is an environment/test-infrastructure gap
                   (no Java classpath under EmptyFileSystem), not a single code edit —
                   (2)-(5): n/a for the same reason — (6) severity `medium`, primary dimension
                   D5: the six D-13 tests are built for code-fix findings; this is routed for
                   triage per D-14, so `classification` is recorded as `major` conservatively,
                   matching RU-61-06's P61-D5-001 precedent for the same class of
                   environment-dependent gap.
effort:            4
dedup:             DEBT-02 — the owning re-triage requirement (Phase 66): "The 3 disabled
                   parser.test.ts assertions and the skipped TEST-03 case re-triaged —
                   enabled, or documented with the specific blocking limitation and what would
                   unblock them." None of the 15 frozen open issues concern these disabled
                   assertions.
disposition:       major-refactor
```

```
id:                P61-D5-004
unit:              RU-61-01
location:          bbj-vscode/test/example-files.test.ts:16-20
dimension:         D5
secondary:         [D8]
severity:          low
evidence_tier:     trace
evidence:          Trace: `fs.readdirSync(testDataFolder).filter(...).forEach(async file => {
                   const result = await parse(...);
                   expect(result.parseResult.lexerErrors).empty;
                   expect(result.parseResult.parserErrors).empty; });`
                   (test/example-files.test.ts:16-20) passes an `async` callback to
                   `Array.prototype.forEach`, which never awaits the callback's returned
                   promise nor propagates its rejection. The outer `test('Parse all files...',
                   async () => {...})` function's own promise resolves as soon as the
                   synchronous forEach loop returns — before any of the awaited `parse(...)`
                   calls or their `expect()` assertions inside the loop have settled — so
                   vitest records the test's pass/fail status independent of whether any file
                   actually fails to parse. Confirmed the test currently passes (`npx vitest
                   run test/example-files.test.ts` → 1 passed) against the sole test-data
                   file, `class-def.bbj`, which does parse cleanly today; that file also
                   contains no line-continuation (`:`-prefixed) or CRLF content, so this
                   corpus additionally does not exercise those bbj-lexer.ts paths.
failure_scenario:  A future .bbj file added to test/test-data/ that fails to lex or parse
                   would NOT fail this test, silently defeating the regression-test guarantee
                   CLAUDE.md's Testing Pattern section states: "Every .bbj file in
                   test/test-data/ is automatically parsed by example-files.test.ts and must
                   produce zero lexer/parser errors."
classification:    easy
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3)
                   no new dependency: pass — (4) regression-testable with vitest (the fix is
                   itself the test-infrastructure correction): pass — (5) reviewer can name
                   the exact edit (replace `.forEach(async ...)` with a `for (const file of
                   ...) { await ... }` loop, or `await Promise.all(files.map(...))`): pass —
                   (6) severity `low`, primary dimension D5 (D8 only secondary): pass — all
                   six pass, classification is `easy`.
effort:            2
dedup:             none
disposition:       easy-fix
```

```
id:                P61-D8-002
unit:              RU-61-01
location:          bbj-vscode/src/language/bbj.langium:948
dimension:         D8
secondary:         [D2]
severity:          low
evidence_tier:     trace
evidence:          Trace: the comment directly above the STRING_LITERAL terminal
                   (bbj.langium:948) reads `// "" escapse " inside a string. Also \ as a plain
                   non escape char. Handled in BBjValueConverter` — asserting that
                   doubled-quote-escape collapsing is handled in BBjValueConverter.
                   BBjValueConverter's STRING_LITERAL case (bbj-value-converter.ts:14, `return
                   input.slice(1, -1);`) only strips the outer quote delimiters and performs
                   no `""` → `"` collapsing, so the comment's central claim is false — same
                   underlying defect as P61-D2-005, viewed from the doc-accuracy angle.
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a
                   runtime failure): a reader of this comment reasonably concludes escaped
                   double-quotes are already normalized in the parsed AST value, which is
                   false.
classification:    easy
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3)
                   no new dependency: pass — (4) regression-testable with vitest: pass — (5)
                   reviewer can name the exact edit (fix the comment, or fix the code per
                   P61-D2-005 so the comment becomes true): pass — (6) severity `low`, primary
                   dimension D8 (D2 only secondary): pass — all six pass, classification is
                   `easy`.
effort:            2
dedup:             none
disposition:       easy-fix
```

### Not-reproducible dispositions
- **Tier failed: `repro` (D1).** Candidate claim: the BBjFilePath greedy-match mis-tokenization (P61-D2-007) could, in principle, cause a statement's `ERR=` error-handling clause to be silently swallowed into an unrelated token, masking error-handling code from ever executing — a security-relevant control-flow-integrity concern. **Reason not recorded as a finding:** confirming this requires enumerating BBj's actual multi-statement-per-line usage patterns combined with `ERR=` clauses in real programs, which is beyond a read-only sweep of these 5 files; the tokenization defect itself is fully captured as `P61-D2-007`, and this note flags the theoretical D1-adjacent angle without asserting it as verified.
- **Tier failed: `trace` (D4).** Candidate claim: some `ClassMember`/`LibMember` grammar alternatives may be unreachable dead rules. **Reason not recorded as a finding:** a full reachability analysis of bbj.langium's ~150 rules requires a call-graph tool beyond manual reading within this sweep's budget; spot-checks of every `SingleStatement` alternative, every `ClassMember` alternative (FieldDecl/MethodDecl/VariableDecl), and every `LibMember` alternative (LibFunction/LibVariable/LibSymbolicLabel) confirmed each is referenced from its parent rule, so no concretely unreachable rule was found to record as a finding, but exhaustive verification was not performed.

### Cross-unit referrals
- **RU-61-06** — java-types.langium's `JavaClass`/`JavaField`/`JavaMethod` interfaces (java-types.langium:33-58) are the AST type-shape declarations that RU-61-06's java-interop.ts populates from unauthenticated, unvalidated JSON-RPC peer data (already recorded there as `P61-D1-002`). No independent finding is recorded here since java-types.langium contains no parsing, validation, or peer-data-handling logic of its own — it is purely the interface shape those interop values are assigned into; the unvalidated-assignment defect belongs entirely to `RU-61-06`'s files.
- **RU-61-05** — the `beforeAll` `WorkspaceManager.initializeWorkspace()` hookTimeout flakiness (root-caused and owned by `RU-61-05` per D-14/the routing table) intermittently strikes this unit's own `test/functional/chevrotain-tokens.test.ts` suite — INVENTORY's "Flaky suite-level failures" table records that suite 21/21-skipped on run 1. Noted here per this plan's explicit instruction; not re-recorded as an `RU-61-01` finding. `RU-61-05`'s own D5 sweep (plan 61-06) owns dispositioning it.

## RU-61-03 — Validation & BBjCPL diagnostics

**Files (8 / 2,542 LOC):**
- `bbj-vscode/src/language/bbj-validator.ts` (566)
- `bbj-vscode/src/language/bbj-document-validator.ts` (271)
- `bbj-vscode/src/language/validations/check-classes.ts` (549)
- `bbj-vscode/src/language/validations/check-function-calls.ts` (196)
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` (343)
- `bbj-vscode/src/language/validations/line-break-validation.ts` (318)
- `bbj-vscode/src/language/bbj-cpl-service.ts` (236)
- `bbj-vscode/src/language/bbj-cpl-parser.ts` (63)

**Risk rank:** 3 of 7 Phase 61 units — `bbj-cpl-service.ts` spawns the external BBjCPL compiler process, and this unit carries the D-06 routing table's pre-identified findings.
**Sweep method (D-08):** full read.
**Owning plan:** 61-03.

### Cells
- D1 Security — fail — Checked `bbj-cpl-service.ts`'s command-line assembly for the spawned BBjCPL compiler: `spawn(bbjcplBin, ['-N', filePath])` (bbj-cpl-service.ts:140) uses the argument-array form with no shell interposed, so `filePath` cannot inject shell syntax; but `bbjcplBin` itself (`getBbjcplPath()`, bbj-cpl-service.ts:228-235) is derived from `wsManager.getBBjDir()` with only a truthiness check, no validation that the resolved `<bbjHome>/bin/bbjcpl[.exe]` path is a legitimate BBj installation — and `bbj.home` is a `window`-scoped VS Code setting (`bbj-vscode/package.json:340`), settable via a workspace-committed `.vscode/settings.json`, the same class of gap `RU-61-06` recorded for `interopHost`/`interopPort` at `P61-D1-001`. Checked whether a classpath value reaches this spawn — it does not; only `bbjHome` and `filePath` are used, and no temp files are written by this unit's code for the compiler invocation. Checked `bbj-cpl-parser.ts`'s `parseBbjcplOutput` for hostile-output-driven diagnostics — it interpolates only a `sourceSnippet` extracted from stderr into a plain-text `message` field with no Markdown/HTML rendering path in this unit's files, so hostile compiler output reaching the IDE is bounded to plain diagnostic text, not markup injection. Checked `check-classes.ts`, `check-function-calls.ts` and `check-variable-scoping.ts` for any sink that writes validated-document-derived content to the filesystem, a URI, or a spawned process — none exists; these three files only call `accept()` to emit diagnostics. 1 finding recorded: `P61-D1-003` (cross-referenced to SEC-05 per this unit's must-have). One D1 candidate considered and not promoted — see Not-reproducible dispositions.
- D2 Correctness & error handling — fail — Checked `bbj-cpl-parser.ts`'s 63 lines against malformed/edge-case compiler output: `parseBbjcplOutput`'s physical-line arithmetic (`parseInt(match[1], 10) - 1`, line 40) produces a negative, out-of-LSP-spec `range.start.line`/`range.end.line` for a reported physical line of `0`, with no clamp anywhere in the function and no test covering that boundary (found `P61-D2-009`); empty/no-error stderr is handled correctly (`if (!stderr.trim()) return diagnostics;`, confirmed against `test/cpl-parser.test.ts`'s dedicated empty/whitespace-only cases). Checked `bbj-cpl-service.ts`'s process lifecycle for the ENOENT/timeout/abort-on-resave/race paths its own comments document — `settle()`'s `settled` guard correctly no-ops a second resolution, `handle.cancel()` correctly kills the live process and clears the timeout before a superseding `compile()` call proceeds, and `proc.on('error', ...)` is attached before any await, so no unhandled-rejection risk was found in this file (contrast with `RU-61-06`'s `P61-D2-002`). Checked `bbj-document-validator.ts`'s `mergeDiagnostics`/`applyDiagnosticHierarchy` for exceptions caught-and-discarded — none found; both are pure array transforms with no try/catch to swallow. Checked all four `validations/*` modules for null propagation on partially-linked ASTs — `check-function-calls.ts`'s `resolveLibFunction`/`inferredKind` explicitly `try/catch` a cyclic-or-unresolved `.ref` access and degrade to `undefined` (documented, not swallowed); `check-classes.ts` guards every `getClass(...)` result with a `klass`/`declaredClass` truthiness check before use. Found a scope-crossing false positive in `check-variable-scoping.ts`'s `checkUseBeforeAssignment`: its Pass 2 traversal comment claims nested `MethodDecl`/`BbjClass`/`DefFunction` bodies are excluded, but the bare `continue` used against `AstUtils.streamAllContents` does not prune the underlying `TreeStreamImpl`, so a Program-scope (or enclosing-method-scope) variable can spuriously flag a same-named, fully valid local variable inside a nested method — reproduced in this sweep (`P61-D2-010`). Checked `line-break-validation.ts` for off-by-one behavior at CRLF and the final line — `hasLinebreakAfter`'s clamped-position lookup and `lineEndRegex`'s optional-CR handling did not reproduce a divergence in this sweep, though no dedicated test confirms this (see `P61-D5-006`). Do not re-report the cyclic-inheritance hang: confirmed `a7e1b53`'s `visitedClasses` termination guard is present and unmodified at `bbj-validator.ts:230-244`, and `check-classes.ts:523-547`'s `MAX_INHERITANCE_DEPTH`-bounded `checkCyclicInheritance` independently terminates the same class of walk. 2 findings recorded: `P61-D2-009`, `P61-D2-010`.
- D3 Performance & resource use — pass — Checked whether BBjCPL runs are debounced or spawned per keystroke: `bbj-document-builder.ts`'s `debouncedCompile` (owned by `RU-61-05`, read for this unit's D3 boundary) wraps `cplService.compile(key)` in a 500ms trailing-edge `setTimeout`, and `bbj-cpl-service.ts`'s own `compile()` additionally aborts any prior in-flight compilation for the same file via `existing.cancel()` before spawning a new one, so at most one live `bbjcpl` process runs per file at a time, not one per keystroke. Checked whether `check-classes.ts` walks the class hierarchy once per member or once per class: `checkBBjClass` checks only the single resolved class's own visibility per call (no ancestor walk); `checkCyclicInheritance` walks the `extends[0]` chain once per `BbjClass` node, bounded by `MAX_INHERITANCE_DEPTH = 20`; `bbjSupertypesReach` (used by the return-type-assignability check) is a bounded, visited-set-guarded DFS over `extends`+`implements`, called once per value-returning `METHODRET`. Checked whether each registered check re-walks the AST independently rather than sharing one traversal: Langium's `ValidationRegistry` dispatches all of this unit's per-node-type checks (`bbj-validator.ts`, `check-classes.ts`, `check-function-calls.ts`) from its own single document-wide walk, with one exception — `check-variable-scoping.ts`'s `checkUseBeforeAssignment` performs its own additional `AstUtils.streamAllContents` sub-walk once per `Program` and once per every `MethodDecl`, and — because of the un-pruning bug recorded as `P61-D2-010` (secondary D3) — the Program-level walk redundantly re-visits every nested method body a second time. This redundancy is bounded (roughly 2x, not quadratic, since BBj methods do not nest inside other methods) and is recorded under `P61-D2-010` rather than as a second entry here. No unbounded accumulation found: `bbj-cpl-service.ts`'s `inFlight` map is bounded to currently-open files and is cleaned up in both the `close` and `error` handlers. No independent D3 finding recorded.
- D4 Maintainability & code smells — fail — Checked `bbj-validator.ts` (566 lines) for duplication against `check-classes.ts`: `BBjValidator.checkClassReference`/`isSubFolderOf` (266-311) are a near-duplicate visibility-check implementation of `ClassValidator.checkClassReference`/`isSubFolderOf` (check-classes.ts:104-188), but a grep across the whole repository confirms `bbj-validator.ts`'s copy is never called from anywhere — dead code, not merely duplicated code (found `P61-D4-006`). Checked `check-classes.ts`'s `ClassValidator` (549 lines, the largest single class read in this unit) for responsibility bundling: it combines class-reference/visibility checking, return-type/field-initializer literal and assignability checking (including an 11-entry hand-maintained `FINAL_TYPE_ASSIGNABLE_TO` map), constructor validation, and cyclic-inheritance detection with no internal module boundary — the same god-class shape `RU-61-06` recorded for `java-interop.ts` at `P61-D4-001` (found `P61-D4-007`). Checked whether the four `validations/*` checks follow one consistent registration/severity-selection pattern: all four register via a `register*Checks(registry, ...)` function called from `bbj-validator.ts:63-65`, and each uses plain `accept('error'|'warning'|'hint', ...)` calls with no shared severity-selection abstraction — consistent, no divergence found. Checked whether the two CPL modules (`bbj-cpl-service.ts`, `bbj-cpl-parser.ts`) share a coherent boundary or leak parsing concerns into the service — they do not: `bbj-cpl-service.ts` owns only process lifecycle and delegates all stderr parsing to `parseBbjcplOutput` in `bbj-cpl-parser.ts`, a clean single-responsibility split; no defect found there. Checked `bbj-document-validator.ts` (271 lines) for repeated hierarchy-walk/diagnostic-emission code — its `applyDiagnosticHierarchy`/`mergeDiagnostics`/`toDiagnostic` functions are each single-purpose with no duplication found. 2 findings recorded: `P61-D4-006`, `P61-D4-007`.
- D5 Test coverage gaps — fail — Checked which of the four `validations/*` modules have a dedicated test file: `check-classes.ts` (`test/class-validations-issues.test.ts` + `test/inheritance-cycle-validation.test.ts`), `check-function-calls.ts` (`test/validation-function-calls.test.ts`) and `check-variable-scoping.ts` (`test/variable-scoping.test.ts`, 404 lines) all do; `line-break-validation.ts` does not — it is exercised only indirectly inside `test/validation.test.ts`, and no test anywhere in `test/` exercises its checks against CRLF line endings or a statement on the document's final line with no trailing newline (found `P61-D5-006`). Checked whether `bbj-cpl-service.ts` and `bbj-cpl-parser.ts` have any test at all, given they require an external compiler: both do — `test/cpl-service.test.ts` (mocked `WorkspaceManager`, no real `bbjcpl` needed) and `test/cpl-parser.test.ts` (fixture-driven, `test/test-data/cpl-fixtures/`) — and `test/cpl-integration.test.ts` exercises the combined path; but no test in `test/cpl-service.test.ts` (all 8 tests read) asserts anything about the legitimacy of the resolved `bbjcpl` path before it is spawned, the coverage gap directly underlying `P61-D1-003` (found `P61-D5-005`). Checked whether malformed-compiler-output handling is tested — `test/cpl-parser.test.ts` covers empty/whitespace-only/mixed-content cases but not the negative-line-number boundary recorded as `P61-D2-009`; not filed as a second overlapping finding since `P61-D2-009` already fully captures that gap's evidence. Checked whether each diagnostic this unit can emit has a regression test naming it — `variable-scoping.test.ts`'s 40+ tests do not include a case with a method-local variable sharing a name with a later Program-scope assignment, the exact scenario `P61-D2-010` reproduces; not filed separately for the same reason as above. Per the plan's explicit instruction, the 11 `test/linking.test.ts` "Interop related tests" failures (already owned by `RU-61-06`'s `P61-D5-001`) and the `beforeAll` hookTimeout flakiness (owned by `RU-61-05`) are not re-recorded here. 2 findings recorded: `P61-D5-005`, `P61-D5-006`.
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — n/a — "This code is part of the single language-server binary (`out/language/main.cjs`) loaded identically by both VS Code and IntelliJ via LSP4IJ; there is no second, divergent implementation to compare it against, so no cross-IDE parity finding is obtainable here."
- D8 Comment & doc accuracy — fail — Checked every comment and JSDoc block across all 8 files against what the code does. `bbj-cpl-service.ts`'s class-level comment (48-49) states BBjCPL wiring into `buildDocuments()` as future work ("Phase 53 will wire this"), but `bbj-document-builder.ts:173` confirms this wiring already exists — stale (found `P61-D8-004`); the same file's `setTimeout()` doc comment claims it is "Called by Phase 53 from VS Code settings wiring", but no caller of `setTimeout()` exists anywhere in the codebase — an unfulfilled claim about dead/unused public API (same finding, secondary D4). Checked `bbj-cpl-parser.ts`'s header comment describing the `<file>: error at line <legacy> (<physical>): <source>` format and the "bbjcpl always exits 0" claim against `test/cpl-parser.test.ts`'s fixtures — accurate, matches. Checked `bbj-document-validator.ts`'s `applyDiagnosticHierarchy` doc comment's stated Rule 0-3 ordering against the implementation (100-128) — accurate. Checked `check-classes.ts`'s extensive method-level doc comments (e.g. `checkMethodReturn`, `checkReturnTypeAssignable`, `isAssignable`) against the code — all accurate, including the deliberately conservative false-positive-avoidance rationale each documents. Checked CLAUDE.md's §Architecture Validation bullet: it names `bbj-validator.ts`, `bbj-document-validator.ts`, `check-classes.ts`, `check-variable-scoping.ts` and `line-break-validation.ts`, correctly describing the first two, but omits `check-function-calls.ts` from the `validations/` list — confirmed against the current `validations/` directory listing (found `P61-D8-003`). 2 findings recorded: `P61-D8-003`, `P61-D8-004`.

### Findings

```
id:                P61-D1-003
unit:              RU-61-03
location:          bbj-vscode/src/language/bbj-cpl-service.ts:82-155,228-235
dimension:         D1
secondary:         []
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace: compile() (bbj-cpl-service.ts:82-155) derives the
                   spawned executable's path entirely from getBbjcplPath() (228-235), which
                   computes path.join(this.wsManager.getBBjDir(), 'bin', binaryName) guarded
                   only by a truthiness check on bbjHome (`if (!bbjHome) return undefined;`)
                   — no check that the resolved path exists, is confined to any allowed
                   directory, or is a genuine BBj installation. compile() (line 140) then
                   spawns that derived path directly via spawn(bbjcplBin, ['-N', filePath])
                   with no further confirmation. bbjHome originates from
                   BBjWorkspaceManager.getBBjDir(), fed by the bbj.home VS Code setting, which
                   bbj-vscode/package.json:340-347 declares "scope": "window" — a
                   workspace-scoped setting settable by a .vscode/settings.json committed
                   inside a cloned repository, the same class of gap already recorded for
                   interopHost/interopPort at P61-D1-001. A runnable reproduction was built
                   and run in this sweep, substituting a controlled directory for bbjHome and
                   confirming that compile() executes whatever program is present at
                   <bbjHome>/bin/bbjcpl (or bbjcpl.exe on Windows) with the current document's
                   file path as an argument — establishing that this is unconditional,
                   unvalidated execution of a workspace-configured path, not a theoretical
                   gap. Per D-12, the trigger sequence and reproduction script are not
                   published in this record.
failure_scenario:  A workspace-scoped .vscode/settings.json committed inside a cloned
                   repository sets bbj.home to a directory an attacker controls. Opening that
                   workspace and triggering any BBjCPL compilation (on-save, under the default
                   compilerTrigger: 'debounced') causes the language server to execute
                   whatever program the attacker placed at <bbj.home>/bin/bbjcpl (or .exe on
                   Windows), with the currently-edited file's path as an argument — full code
                   execution in the language-server process, with no confirmation step visible
                   in this unit's files.
classification:    major
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                   (3) no new dependency: pass — (4) regression-testable with vitest,
                   confirmed via the reproduction built in this sweep using the existing
                   createMockServices pattern in test/cpl-service.test.ts: pass — (5)
                   reviewer can name the exact edit (validate that the resolved bbjcpl path
                   exists and is confined to an expected layout before spawning, or warn/gate
                   on an unusual bbjHome): pass — (6) severity is `high`: FAIL — `major`
                   regardless of the other five tests (D-13's safety gate).
effort:            4
dedup:             none — checked against #231 (Support Custom Classpath and Command Line
                   Settings for starting BBj Programs), the closest area match — it requests
                   ADDING configurable classpath/CLI args for RUN commands, not validating the
                   bbjcpl binary path already spawned here; #466 and #90 (this unit's flagged
                   plausible neighbours) do not concern process-spawn path validation either.
                   No frozen open issue addresses bbjcpl binary-path validation.
disposition:       major-refactor
```

```
id:                P61-D2-009
unit:              RU-61-03
location:          bbj-vscode/src/language/bbj-cpl-parser.ts:40-46
dimension:         D2
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          Runnable reproduction of parseBbjcplOutput's own regex/arithmetic against a
                   malformed-but-plausible bbjcpl line reporting physical line "0"
                   (`/some/file.bbj: error at line 10 (0):     bad code`): `physicalLine =
                   parseInt(match[1], 10) - 1` (bbj-cpl-parser.ts:40) evaluates to -1, which
                   flows unclamped into the returned Diagnostic's range.start.line/
                   range.end.line (lines 43-46) — reproduced directly: `parseInt('0', 10) - 1
                   === -1`. No test in test/cpl-parser.test.ts exercises a reported physical
                   line of 0 or 1 (the boundary case), and no clamp/guard exists anywhere in
                   this function, in contrast with bbj-document-validator.ts:228's
                   extractCyclicReferenceRelatedInfo, which clamps an equivalent 1-based-to
                   -0-based line conversion with Math.max(0, line).
failure_scenario:  bbjcpl emits (or a future compiler version emits, or a malformed/truncated
                   compiler invocation produces) an error line reporting physical line 0, or a
                   line number exceeding the LSP client's document's actual line count;
                   parseBbjcplOutput returns a Diagnostic with a negative range.start.line,
                   outside the LSP Position contract (zero-based, non-negative), which can be
                   rejected, clamped unpredictably, or cause a client-side rendering exception
                   instead of surfacing the intended compiler error.
classification:    easy
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                   (3) no new dependency: pass — (4) regression-testable with vitest: pass —
                   (5) reviewer can name the exact edit (`Math.max(0, parseInt(match[1], 10) -
                   1)`): pass — (6) severity `low`, dimension D2 (not D1): pass — all six pass,
                   classification is `easy`.
effort:            2
dedup:             none — checked against #466 and #90 (this unit's flagged plausible
                   neighbours) and the rest of the frozen 15; none address BBjCPL diagnostic
                   line-number bounds.
disposition:       easy-fix
```

```
id:                P61-D2-010
unit:              RU-61-03
location:          bbj-vscode/src/language/validations/check-variable-scoping.ts:205-220
dimension:         D2
secondary:         [D3]
severity:          medium
evidence_tier:     repro
evidence:          Runnable reproduction, confirmed in this sweep via a throwaway vitest file
                   (not committed): checkUseBeforeAssignment's Pass 2 loop (lines 205-220)
                   reads `for (const child of AstUtils.streamAllContents(node)) { if
                   (isMethodDecl(child) && child !== node) { continue; } ... }`, intending, per
                   the function's own doc comment (lines 44-46: "Does NOT recurse into
                   MethodDecl... AstUtils.streamAllContents visits everything, so we need to
                   filter"), to exclude nested-scope usages from the outer scope's check.
                   AstUtils.streamAllContents returns a TreeStreamImpl
                   (langium/src/utils/stream.ts:797-825) whose traversal only stops descending
                   into a node's children when the consumer calls the iterator's own prune()
                   method; a bare `continue` inside a for...of loop does not call prune() — it
                   only skips processing of the matched node itself, while the stream still
                   yields every descendant underneath it on subsequent iterations. Compiled a
                   class TestPrune containing `method public void test()` with a local `x = 1;
                   PRINT x` and, after the class, a program-scope `x = 99`:
                   checkUseBeforeAssignment(Program, ...)'s Pass 1 correctly records only the
                   program-scope assignment (x -> offset of x = 99, since walkStatements does
                   not recurse into MethodDecl bodies), but Pass 2's un-pruned traversal still
                   reaches the method body's PRINT x SymbolRef, matches it against the
                   program-scope declPositions map by string name alone (no AST-identity
                   check), finds usageOffset < declOffset, and emits a hint. Reproduction
                   output: a single Hint diagnostic "'x' used before assignment (first
                   assigned at line 8)" on the method-body PRINT x, even though the method's
                   own local x = 1 correctly precedes its own PRINT x — the method's own
                   separate checkUseBeforeAssignment(MethodDecl, ...) call correctly produces
                   no hint for the same usage; only the outer Program-scope's un-pruned walk
                   misfires.
failure_scenario:  Any BBj program containing a class/method whose body assigns and then reads
                   a local variable, where an unrelated Program-scope (or
                   enclosing-method-scope) variable happens to share the same case-insensitive
                   name and is assigned later in document order, produces a spurious "used
                   before assignment" Hint on the method-local variable's perfectly valid read
                   — a false positive traceable to the outer scope's traversal reaching into a
                   nested scope it was documented not to enter. The same un-pruned traversal is
                   also a redundant full-subtree AST walk (secondary D3): every Program-level
                   validation pass additionally re-walks the body of every nested MethodDecl
                   that the MethodDecl's own separate validation pass already walks in full.
classification:    easy
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                   (3) no new dependency: pass — (4) regression-testable with vitest,
                   demonstrated by the reproduction above: pass — (5) reviewer can name the
                   exact edit (use the TreeStream iterator's prune() method, or switch to a
                   manual recursive walk mirroring walkStatements's exclusion logic, instead
                   of a bare continue in the for...of loop): pass — (6) severity `medium`,
                   primary dimension D2 (D3 only secondary): pass — all six pass,
                   classification is `easy`.
effort:            4
dedup:             none — checked against #466 (sibling-type method return mismatches — a
                   different check entirely) and #90 (opting files/regions out of linking — a
                   different subsystem, RU-61-02's linker, not this unit's scope walk) as this
                   unit's flagged plausible neighbours, and against the remaining 13; none
                   concern variable-scoping's use-before-assignment traversal.
disposition:       easy-fix
```

```
id:                P61-D4-006
unit:              RU-61-03
location:          bbj-vscode/src/language/bbj-validator.ts:266-311
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Trace, confirmed by exhaustive grep across bbj-vscode/:
                   BBjValidator.checkClassReference (bbj-validator.ts:266-303) and its private
                   helper isSubFolderOf (305-311) are never called from anywhere in the
                   codebase — `grep -rn '\.checkClassReference\b' bbj-vscode --include=*.ts`
                   (excluding their own declarations) returns only calls to a DIFFERENT
                   checkClassReference implementation, ClassValidator.checkClassReference in
                   validations/check-classes.ts:112-128, which IS wired into the validation
                   registry (check-classes.ts:37,44,56,64,71,77,81) and is the one that
                   actually runs. The two implementations are near-duplicates of the same
                   PUBLIC/PROTECTED/PRIVATE visibility-check shape — both switch on
                   klass.visibility.toUpperCase(), both call an isSubFolderOf helper with an
                   identical body (bbj-validator.ts:305-311 vs check-classes.ts:104-110) — but
                   bbj-validator.ts's copy operates on Reference<Class> while
                   check-classes.ts's operates on QualifiedClass and additionally handles the
                   unresolvable-type warning case the dead copy does not.
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a
                   runtime failure): ~46 lines of dead, unreachable code sit alongside the
                   working implementation with an almost-identical name and shape; a future
                   contributor fixing a visibility-check bug in check-classes.ts's
                   checkClassReference has no signal that bbj-validator.ts's same-named method
                   is inert, and could plausibly "fix" the wrong one.
classification:    easy
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: these are
                   internal, unexported methods on the internal BBjValidator class, not part
                   of any published API: pass — (3) no new dependency: pass — (4)
                   regression-testable, confirmed by the existing suite staying green after
                   removal: pass — (5) reviewer can name the exact edit (delete
                   bbj-validator.ts:266-311, or wire it up if it was meant to replace
                   check-classes.ts's copy): pass — (6) severity `low`, dimension D4: pass —
                   all six pass, classification is `easy`.
effort:            2
dedup:             none — checked against #466 and #90 (this unit's flagged plausible
                   neighbours); neither concerns dead code or the visibility-check
                   implementations.
disposition:       easy-fix
```

```
id:                P61-D4-007
unit:              RU-61-03
location:          bbj-vscode/src/language/validations/check-classes.ts:89-548
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Trace: the single class ClassValidator (check-classes.ts:89-548, 460 of
                   the file's 549 lines) bundles at least 4 distinct responsibilities with no
                   internal module boundary: class-reference/visibility checking
                   (checkClassReference/warnUnresolvableType/checkBBjClass/isSubFolderOf,
                   104-188), return-type and field-initializer literal/assignability checking,
                   including a hand-maintained 11-entry FINAL_TYPE_ASSIGNABLE_TO supertype map
                   (checkMethodReturn/checkReturnTypeAssignable/isAssignable/
                   bbjSupertypesReach/classFqn/classDisplayName/checkFieldInit/
                   literalTypeMismatch/simpleTypeName, 190-457), constructor validation
                   (checkInstantiable/checkConstructorArguments/isArrayConstruction, 459-521),
                   and cyclic-inheritance detection (checkCyclicInheritance, 523-547) — the
                   same god-class shape already recorded for java-interop.ts at P61-D4-001 in
                   RU-61-06. #466 (sibling-type method return mismatches via Java class
                   hierarchy) partially overlaps this file's FINAL_TYPE_ASSIGNABLE_TO
                   mechanism — the existing code already implements a conservative version of
                   #466's request, limited to well-known FINAL Java types (String, the boxed
                   numeric types, BigDecimal/BigInteger) — but this finding is about the
                   class's responsibility count, not about extending that coverage, so no
                   duplication with #466's feature request.
failure_scenario:  n/a (D4 trace-tier finding — the code shape itself is the defect, not a
                   runtime failure): a future change to any one responsibility (e.g.,
                   extending FINAL_TYPE_ASSIGNABLE_TO per #466, or changing the
                   cyclic-inheritance depth bound) risks touching unrelated state or logic in
                   the same 460-line class, and a new contributor cannot reason about one
                   responsibility (e.g., constructor-argument arity) without reading the whole
                   class.
classification:    major
                   (1) touches 1 file: FAIL — a responsibility split necessarily creates or
                   touches more than one file — (2) no public API/grammar/LSP change: pass —
                   (3) no new dependency: pass — (4) regression-testable with vitest, using
                   the existing class-validations-issues.test.ts/inheritance-cycle
                   -validation.test.ts suites as a regression baseline: pass — (5) reviewer
                   can name the exact edit (extract return-type/field-init checking and
                   constructor validation into their own modules, mirroring how
                   check-function-calls.ts and check-variable-scoping.ts are already separated
                   from check-classes.ts): pass — (6) severity `low`, dimension D4: pass — but
                   test (1) already fails, so classification is `major`.
effort:            8
dedup:             #466 partial-overlap — this finding's subject (the class's responsibility
                   count) does not duplicate #466's request (extending sibling-type mismatch
                   detection), but the FINAL_TYPE_ASSIGNABLE_TO mechanism this finding names is
                   the code #466 would extend, so cross-referencing is useful when #466 is
                   triaged. Checked against #90 also (this unit's other flagged plausible
                   neighbour); no overlap.
disposition:       major-refactor
```

```
id:                P61-D5-005
unit:              RU-61-03
location:          bbj-vscode/test/cpl-service.test.ts:1-133
dimension:         D5
secondary:         [D1]
severity:          medium
evidence_tier:     trace
evidence:          Trace of every test in test/cpl-service.test.ts (all 8, read in full): each
                   test asserts graceful []-returning behavior for an empty or non-existent
                   bbjHome (ENOENT), abort-on-resave, isCompiling, and setTimeout — none
                   asserts anything about the LEGITIMACY of the resolved bbjcpl path before it
                   is spawned. A reproduction built and run in this sweep (see P61-D1-003)
                   shows compile() executes whatever is present at <bbjHome>/bin/bbjcpl; no
                   test in this file, nor anywhere else under test/, exercises that path with
                   a controlled non-empty bbjHome pointing at a substitute executable to
                   assert the current (unvalidated) behavior or a future validated one.
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a
                   future change to getBbjcplPath()/compile()'s path-validation behavior
                   (e.g. a fix for P61-D1-003) has no existing regression test to confirm it
                   actually rejects an untrusted bbjHome, or to prevent a future regression
                   from silently reopening the gap.
classification:    easy
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                   (3) no new dependency: pass — (4) IS itself the regression-testable
                   artifact: pass — (5) reviewer can name the exact edit (add a test using
                   the file's own createMockServices helper with a bbjHome pointing at a
                   controlled substitute binary, asserting the spawn is rejected once
                   P61-D1-003 is fixed, or documenting the current unvalidated behavior
                   explicitly): pass — (6) severity `medium`, primary dimension D5 (D1 only
                   secondary): pass — all six pass, classification is `easy`.
effort:            2
dedup:             none — checked against #466 and #90 (this unit's flagged plausible
                   neighbours) and #231 (closest area match, a feature request for
                   RUN-command classpath/CLI settings, not bbjcpl test coverage); none address
                   this test-coverage gap.
disposition:       easy-fix
```

```
id:                P61-D5-006
unit:              RU-61-03
location:          bbj-vscode/src/language/validations/line-break-validation.ts:294-318
dimension:         D5
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Trace: line-break-validation.ts has no dedicated test file (unlike
                   check-classes.ts, check-function-calls.ts and check-variable-scoping.ts,
                   each with a named test file); its checks are exercised only indirectly
                   inside test/validation.test.ts (confirmed by `grep -n "line break"
                   test/validation.test.ts`, 9 hits, none containing \r\n). `grep -rn
                   "\r\n" test/*.ts` shows the only CRLF-aware test in the whole test/
                   directory is test/line-numbering.test.ts's "handles CRLF line endings" — a
                   different unit's file (bbj-vscode/src/line-numbering.ts, outside
                   bbj-vscode/src/language/). hasLinebreakBefore/hasLinebreakAfter (294-318)
                   compute text ranges keyed on node.range.start.line/node.range.end.line + 1,
                   the same shape RU-61-01 already flagged as CRLF-sensitive in the lexer's
                   line splitter (P61-D2-006) — no test here confirms this file's own
                   line-break checks behave correctly against a source file containing CRLF
                   endings, or against a statement on the document's final line with no
                   trailing newline.
failure_scenario:  n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a
                   regression in hasLinebreakBefore/hasLinebreakAfter's CRLF or final-line
                   handling would pass the full npm test suite undetected, because no test
                   exercises either case for this file's checks.
classification:    easy
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                   (3) no new dependency: pass — (4) IS itself the regression-testable
                   artifact: pass — (5) reviewer can name the exact edit (add CRLF and
                   no-trailing-newline cases to test/validation.test.ts or a new dedicated
                   file): pass — (6) severity `low`, dimension D5: pass — all six pass,
                   classification is `easy`.
effort:            2
dedup:             none — checked against #466 and #90 (this unit's flagged plausible
                   neighbours); neither concerns line-break-validation test coverage.
disposition:       easy-fix
```

```
id:                P61-D8-003
unit:              RU-61-03
location:          CLAUDE.md:34
dimension:         D8
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Trace: CLAUDE.md's §Architecture Validation bullet reads: "Validation:
                   bbj-validator.ts (main validator registering checks),
                   bbj-document-validator.ts (document-level validation with BBjCPL compiler
                   integration), plus validations/check-classes.ts,
                   validations/check-variable-scoping.ts, validations/line-break
                   -validation.ts" — confirmed against the current file list (`ls
                   bbj-vscode/src/language/validations/`: check-classes.ts,
                   check-function-calls.ts, check-variable-scoping.ts, line-break
                   -validation.ts, 4 files) that check-function-calls.ts (196 lines,
                   registered via registerFunctionCallChecks in bbj-validator.ts:17,65) is
                   omitted from the bullet's list of three. The rest of the bullet is
                   accurate: bbj-validator.ts does register the checks (confirmed in Task 1),
                   and bbj-document-validator.ts does integrate BBjCPL (confirmed via its
                   mergeDiagnostics/applyDiagnosticHierarchy functions, also read in this
                   sweep).
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a
                   runtime failure): a reader of CLAUDE.md's Architecture section forms an
                   incomplete picture of the validation surface, unaware that
                   builtin-function-call argument/arity/return-type checking is a fourth,
                   separate validations/ module.
classification:    easy
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                   (3) no new dependency: pass — (4) regression-testable with vitest: pass —
                   (5) reviewer can name the exact edit (add
                   validations/check-function-calls.ts to the bullet's list): pass — (6)
                   severity `low`, dimension D8: pass — all six pass, classification is
                   `easy`.
effort:            2
dedup:             none — checked against #466 and #90 (this unit's flagged plausible
                   neighbours); neither concerns CLAUDE.md's Architecture section.
disposition:       easy-fix
```

```
id:                P61-D8-004
unit:              RU-61-03
location:          bbj-vscode/src/language/bbj-cpl-service.ts:48-49,203-207
dimension:         D8
secondary:         [D4]
severity:          low
evidence_tier:     trace
evidence:          Trace: the class-level doc comment (bbj-cpl-service.ts:48-49) reads "Phase
                   53 will wire this into buildDocuments() via:
                   services.compiler.BBjCPLService.compile(filePath)" — stated as future work,
                   but bbj-document-builder.ts:173 (`const cplDiags = await
                   cplService.compile(key);`) confirms this wiring is already done; the
                   comment describes a completed integration as still pending. Separately,
                   setTimeout(ms: number): void's own doc comment (203-207) reads "Called by
                   Phase 53 from VS Code settings wiring" — `grep -rn '\.setTimeout('
                   bbj-vscode/src/language bbj-vscode/src` (excluding this file's own
                   declaration) returns no caller anywhere in the codebase: this claim was
                   never fulfilled, and the method is dead/unused public API with a comment
                   asserting a caller that does not exist.
failure_scenario:  n/a (D8 trace-tier finding — a documentation-accuracy defect, not a
                   runtime failure): a reader of compile()'s class-level comment could wrongly
                   conclude BBjCPL diagnostics are not yet surfaced to users (they are, via
                   the debounced on-save path in bbj-document-builder.ts), and a reader of
                   setTimeout()'s comment could wrongly assume the compile timeout is
                   configurable from VS Code settings today, when no such wiring exists.
classification:    easy
                   (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                   (3) no new dependency: pass — (4) regression-testable with vitest: pass —
                   (5) reviewer can name the exact edit (update the class comment to state the
                   integration is complete, and either wire setTimeout() to a settings path or
                   update its comment to reflect that it is currently unused): pass — (6)
                   severity `low`, dimension D8 (D4 only secondary): pass — all six pass,
                   classification is `easy`.
effort:            2
dedup:             none — checked against #466 and #90 (this unit's flagged plausible
                   neighbours); neither concerns these stale comments.
disposition:       easy-fix
```

### Not-reproducible dispositions
- **Tier failed: `repro` (D1).** Candidate claim: `bbjcpl` inherits the language-server
  process's full environment (`spawn()` in `bbj-cpl-service.ts:140` passes no `env` override),
  which could expose secrets if the server process's environment holds sensitive values.
  **Reason not recorded as a finding:** confirming this requires knowing what secrets (if any)
  the language-server process's environment typically holds in production IDE deployments,
  which is outside a read-only sweep of these 8 files; no evidence in this unit's code that
  anything currently populates the server's own environment with secrets. The unvalidated
  *path* to the inherited-environment process is still recorded as `P61-D1-003`; the stronger
  claim of confirmed secret exposure is not asserted without deployment-specific evidence.
- **Tier failed: `repro` (D2).** Candidate claim: `bbj-cpl-parser.ts`'s `ERROR_LINE_RE`
  (`^.+:\s+error at line \d+ \((\d+)\):\s*(.*)`) could mis-parse a source-code snippet that
  itself happens to contain the literal substring `error at line N (M):`, echoed back verbatim
  by the compiler inside a string-literal source line, causing a shifted or duplicated
  diagnostic. **Reason not recorded as a finding:** confirming or refuting this requires
  knowing `bbjcpl`'s real output format for source-snippet echoing beyond what the three
  fixtures in `test/test-data/cpl-fixtures/` cover, and no real `bbjcpl` binary is available in
  this sandbox to probe further; the regex's `^.+:` anchor requires the line to start with a
  file-path-then-colon prefix, which the indented source-echo lines in the existing fixtures do
  not have, so this remains a theoretical, unconfirmed edge case.

### Cross-unit referrals
- **RU-61-05** — `bbj-document-builder.ts`'s `trackBbjcplAvailability()` (owned by `RU-61-05`)
  performs the same path-existence-only check (`accessSync`) as this unit's own gap recorded at
  `P61-D1-003` — confirming the binary *exists* is not the same as confirming it is a
  legitimate BBj compiler. `RU-61-05`'s own D1/D4 sweep should confirm whether that caller adds
  validation this unit's `compile()` does not see, or record its own finding if not.

## RU-61-02 — Scope, linking & type inference

**Files (8 / 1,601 LOC):**
- `bbj-vscode/src/language/bbj-scope.ts` (578)
- `bbj-vscode/src/language/bbj-scope-local.ts` (408)
- `bbj-vscode/src/language/bbj-linker.ts` (229)
- `bbj-vscode/src/language/bbj-index-manager.ts` (29)
- `bbj-vscode/src/language/bbj-nodedescription-provider.ts` (131)
- `bbj-vscode/src/language/bbj-type-inferer.ts` (107)
- `bbj-vscode/src/language/bbj-overload-selector.ts` (115)
- `bbj-vscode/src/language/assertions.ts` (4)

**Risk rank:** 4 of 7 Phase 61 units — the semantic core (name resolution, cross-file linking, type inference); #232's CPU-stability tech debt (multi-project workspace scope walks) is routed here.
**Sweep method (D-08):** full read.
**Owning plan:** 61-04.

### Cells
- D1 Security — pass — Checked whether cross-file linking resolves document URIs derived from `USE` statements / `::file::Class` paths or configured `prefixes` without workspace constraint: `getBBjClassesFromFile` (bbj-scope.ts:308-331) builds candidate URIs from the current doc dir, every workspace root, and every configured `prefixes` entry via `resolve(prefixPath, bbjFilePath)` — `bbjFilePath` is untrusted source text and `resolve()` permits `..` traversal — but the result is used only to filter `indexManager.allElements(BbjClass.$type)` by URI equality, never to open or load a file; a URI with no matching already-indexed document simply yields an empty scope, so this unit's own code cannot be made to read outside the workspace/prefix set it was already given (see Not-reproducible dispositions for the boundary question this defers to `RU-61-05`). Checked whether `bbj-nodedescription-provider.ts` copies peer-supplied Java descriptions into the global index without validation: it does not re-copy raw peer fields — `enhanceFunctionDescription`/`toMethodData`/`toDefFunctionData` (bbj-nodedescription-provider.ts:30-59) only read already-typed AST properties (`MethodDecl`/`DefFunction`/`LibFunction`/`JavaMethod`), and the underlying peer-response admission itself is `RU-61-06`'s `java-interop.ts:543-596`, already recorded as `P61-D1-002` there. Checked whether `bbj-index-manager.ts` (29 lines) admits entries from any source it does not control: its only override, `isAffected()` (bbj-index-manager.ts:14-27), narrows which documents get rebuilt — it adds no new admission path, only a rebuild-skip optimization delegated to `DefaultIndexManager` for everything else. No `RU-61-02` finding recorded.
- D2 Correctness & error handling — fail — **Ties:** `bbj-overload-selector.ts:37-51`'s `findBestOverload` places the linked declaration first in its candidate array and uses strict `>` when comparing scores, so an exact tie always resolves to the linked (first-scope-yielded) declaration — deterministic and stable across runs (declaration order for `MethodDecl` siblings, classpath-response order for `JavaMethod` siblings). `bbj-scope.ts`'s local-vs-member shadowing (`StreamScopeWithPredicate.getElement`, bbj-scope.ts:508-524) always checks the inner/local scope first and falls through to `outerScope` only on a miss — nearest-scope-wins, deterministic. `bbj-linker.ts`'s duplicate-qualified-name case (two documents exporting the identical `::file::Class` name) cannot occur in practice because the qualified name embeds the exporting file's own path (bbj-scope.ts:322-323), so two *different* files can never produce the same qualified name; the only realistic duplicate is two `class` declarations sharing a name inside one file, which resolves by first-match iteration order over that file's local scope (same deterministic first-wins rule, no crash). However: `findBestOverload` is called from exactly one place in the whole codebase — `bbj-inlay-hint-provider.ts:65` (confirmed via `grep -rn findBestOverload bbj-vscode/src/`) — while `bbj-type-inferer.ts:47-48,77-78` and `bbj-linker.ts:105-110`'s `getCandidate` both trust the first-scope-yielded declaration's return type/identity directly, never re-selecting by the call's actual argument shape; recorded as `P61-D2-012`. **Empty/single-element/failed-load inputs:** an empty `Program` and a single-declaration `Program` both traverse `collectLocalSymbols`'/`processNode`'s loops zero or one time with no special-cased branch, no crash; a reference whose target document failed to load resolves via `getBBjClassesFromFile` to an empty `bbjClasses` array (bbj-scope.ts:317-319), which `bbj-linker.ts:133-140` turns into a `LinkingError` — the standard, already-diagnosed path, no swallowed failure. **Null propagation / DEBT-03:** `bbj-type-inferer.ts:75-76`'s `isJavaMethod(member)` branch returns `member.resolvedReturnType?.ref` with **no fallback** to the always-present raw `member.returnType: string` (generated/ast.ts:1350) when `resolvedReturnType` is unset — reproduced with a throwaway, uncommitted vitest test (deleted before this commit, `git status --porcelain bbj-vscode` clean): pushing a `JavaMethod` (`valueOf`, `returnType: 'java.lang.String'`) onto the fake `java.lang.String` class with `resolvedReturnType` left unset (simulating any path that bypasses java-interop.ts's async Phase 2 at `java-interop.ts:615-618`) and validating `methodret String.valueOf(2)` against a declared `java.util.HashMap` return type produced **zero** "incompatible type" diagnostics — proving `getType()` silently returned `undefined` instead of the expected mismatch the positive-control tests in `method-return-java-type.test.ts` already demonstrate for a correctly-resolved case. Recorded as `P61-D2-011`, `dedup` naming DEBT-03. **Swallowed exceptions:** `bbj-scope.ts:200-206`, `bbj-type-inferer.ts:34-40,67-71`, and `bbj-scope-local.ts:169-172` each catch cyclic-reference/resolution errors and either silently ignore (documented `// cyclic reference, ignore`) or `logger.warn`/`console.error` before continuing — none swallow silently without a trace, no finding. **Java-interop-unavailable distinguishability (SEC-06/boundary, owned by `RU-61-06`):** `bbj-scope-local.ts:158-165` treats every `javaClass.error` uniformly regardless of cause (peer unreachable vs. genuinely-missing class) and surfaces the same generic unresolved-reference linking diagnostic either way — stated here per the plan's instruction, not recorded as a `RU-61-02` finding; see Cross-unit referrals. 2 findings recorded: `P61-D2-011`, `P61-D2-012`.
- D3 Performance & resource use — fail — This unit owns the routing-table item **#232 CPU stability in multi-project workspaces (DEBT-01)**. Re-triaged against the current code (not restated): two current-code mechanisms scale with total multi-project workspace size rather than the referencing file's own size. (1) `getBBjClassesFromFile` (bbj-scope.ts:308-331) performs a full linear scan of `indexManager.allElements(BbjClass.$type)` — every `BbjClass` in the **entire workspace index, across all loaded projects** — on **every** `::file::Class`-qualified reference and on every `USE "::file::"` resolution, with no per-file/per-request cache; a document with many such references pays this full-index scan once per reference. (2) `collectLocalSymbols` (bbj-scope-local.ts:106-114) walks the **full, unpruned** AST of every document via `AstUtils.streamAllContents(rootNode)` with a per-node `await interruptAndCheck(cancelToken)` — contrast `bbj-linker.ts:47-58`'s `link()`, which already calls `treeIter.prune()` to skip external-document private-member subtrees; `collectLocalSymbols` has no equivalent `isExternalDocument`-aware pruning, so in a multi-project workspace every loaded external project's documents pay full per-node scope-computation cost proportional to their own total LOC, not just the active project's. Recorded as `P61-D3-003`, severity `high` (matches this unit's own pre-registered threat `T-61-P04-S1`), `dedup` stating #232 is not in the frozen 15-issue snapshot (not an open issue) and naming **DEBT-01** as the owning requirement so Phase 66 re-triages against this evidence rather than re-deriving it. Beyond #232: `bbj-index-manager.ts:14-27`'s `isAffected()` override already implements a **present, partial** mitigation — it skips rebuilding external documents when only non-external URIs changed — so DEBT-01's "documented mitigations" are partially present at the index-rebuild layer but absent at the two request-time paths above; checked whether the linker re-resolves already-resolved references (no — Langium's standard reference caching applies, no override here re-triggers it) and whether the index grows unbounded as documents open/close (index growth is `DefaultIndexManager`'s standard lifecycle, not overridden by this unit — no finding). 1 finding recorded: `P61-D3-003`.
- D4 Maintainability & code smells — pending
- D5 Test coverage gaps — pending
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — n/a — "This code is part of the single language-server binary (`out/language/main.cjs`) loaded identically by both VS Code and IntelliJ via LSP4IJ; there is no second, divergent implementation to compare it against, so no cross-IDE parity finding is obtainable here."
- D8 Comment & doc accuracy — pending

### Findings

```
id:                P61-D2-011
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-type-inferer.ts:75-76
dimension:         D2
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Reproduced with a throwaway, uncommitted vitest test (run via `npx vitest run`,
                    deleted before this commit — `git status --porcelain bbj-vscode` is clean):
                    pushed a synthetic `JavaMethod` ('valueOf', isStatic: true,
                    returnType: 'java.lang.String') onto the test double's fake
                    `java.lang.String` JavaClass with `resolvedReturnType` intentionally left
                    unset — the exact shape produced whenever java-interop.ts's async Phase 2
                    (java-interop.ts:615-618, which alone populates `resolvedReturnType`) has
                    not completed for a given method. Validated
                    `methodret String.valueOf(2)` against a declared `java.util.HashMap` return
                    type (method-return-java-type.test.ts's own #437 mismatch-detection
                    mechanism) and got zero "returns a value of incompatible type"
                    diagnostics, proving getType() returned `undefined` for the call instead of
                    `java.lang.String`. Line-by-line: getTypeInternal's isMemberCall branch
                    (bbj-type-inferer.ts:72-83) reads `member.resolvedReturnType?.ref` only —
                    JavaMethod's raw `returnType: string` (generated/ast.ts:1350) is always
                    present but is never consulted as a fallback.
failure_scenario:  Any static or instance Java method call whose JavaMethod.resolvedReturnType
                    has not (yet, or ever) been populated — a resolution race, a partially
                    resolved class, or any future code path that constructs/updates a JavaMethod
                    outside java-interop.ts's own resolveClass() Phase 2 — causes
                    bbj-type-inferer.ts to silently return no type for that call site, with no
                    diagnostic explaining why. This matches DEBT-03's documented symptom
                    (`String.valueOf(2)` assigns no type).
classification:    easy
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with vitest: pass,
                    proven by the reproduction above — (5) reviewer can name the exact edit (in
                    the isJavaMethod branch, fall back to
                    `this.javaInterop.getResolvedClass(member.returnType)` when
                    `resolvedReturnType?.ref` is undefined): pass — (6) severity `medium`,
                    dimension D2 (not D1): pass — all six pass, `easy`.
effort:            4
dedup:             none — checked #83 (project-wide USE statements, no match), #90 (opting
                    files/regions out of linking, no match), #466 (sibling-type method return
                    mismatch validation assumes a resolved type already exists and compares it
                    against a hierarchy — this finding is about the type never being inferred in
                    the first place, a different and upstream mechanism, no overlap); names
                    DEBT-03 as the owning re-triage item per the routing table.
disposition:       easy-fix
```

```
id:                P61-D2-012
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-type-inferer.ts:47-48,77-78
dimension:         D2
secondary:         [D4, D8]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: `grep -rn findBestOverload bbj-vscode/src/` returns exactly
                    one call site, `bbj-inlay-hint-provider.ts:65` — no other file, including
                    `bbj-type-inferer.ts` and `bbj-linker.ts`, ever calls it.
                    bbj-type-inferer.ts:47-48 (`isMethodDecl(reference) => getClass(reference.returnType)`)
                    and :77-78 (`isMethodDecl(member) => getClass(member.returnType)`) both read
                    the return type of whatever declaration the LINKER already picked, with no
                    re-selection by the call's actual argument count/types.
                    bbj-linker.ts:105-110's getCandidate does a first-match
                    `scope.getElement(refInfo.reference.$refText, ...)` with the same
                    no-re-selection behavior. bbj-overload-selector.ts's own header comment
                    ("Call sites re-select among the sibling overloads by the call's shape",
                    lines 10-12) states this generally, but only one of this codebase's several
                    overload-sensitive call sites (hover, completion, type inference, linking)
                    actually does so.
failure_scenario:  A BBj class or Java class with two same-named method overloads whose scope
                    order (declaration order, or classpath-response order) yields the
                    argument-shape-WRONG overload first: the linker links to that first-yielded
                    declaration regardless of the call's real argument count/types (#478's
                    original symptom, already fixed for bbj-inlay-hint-provider.ts's parameter
                    hints), and bbj-type-inferer.ts propagates that same wrong declaration's
                    return type unconditionally — an overload-sensitive call site can therefore
                    be typed by the wrong overload's return type with nothing to correct it.
classification:    major
                    (1) touches 1 file: FAIL — a real fix needs bbj-linker.ts's getCandidate (or
                    bbj-type-inferer.ts) to consult bbj-overload-selector.ts, spanning at least
                    two files — (2) no public API/grammar/LSP change: pass — (3) no new
                    dependency: pass — (4) regression-testable with vitest: pass — (5) reviewer
                    can name the exact edit (call findBestOverload from getCandidate/getType and
                    re-derive identity/return-type from the winning candidate): pass — (6)
                    severity medium, dimension D2 (not D1): pass — but test (1) already fails,
                    so classification is `major`.
effort:            8
dedup:             none — checked #83 (no match), #90 (no match), #466 (sibling-type RETURN
                    MISMATCH VALIDATION assumes the resolved overload is already correct and
                    compares its declared type against a hierarchy — this finding is about
                    resolving to the wrong overload in the first place, upstream of and
                    unrelated to #466's validation mechanism, no overlap); no frozen issue names
                    overload re-selection for linking/type-inference specifically.
disposition:       major-refactor
```

```
id:                P61-D3-003
unit:              RU-61-02
location:          bbj-vscode/src/language/bbj-scope.ts:308-331
dimension:         D3
secondary:         []
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace, re-triaging routing-table item #232 (CPU stability in
                    multi-project workspaces, DEBT-01) against the current code. (1)
                    getBBjClassesFromFile (bbj-scope.ts:308-331) calls
                    `this.indexManager.allElements(BbjClass.$type).filter(...)` — a full linear
                    scan of every BbjClass in the entire workspace index across all loaded
                    projects — on every `::file::Class`-qualified class reference and every
                    `USE "::file::"` resolution (bbj-scope.ts:250, 342), with no per-file or
                    per-request cache. (2) collectLocalSymbols (bbj-scope-local.ts:106-114) walks
                    `AstUtils.streamAllContents(rootNode)` — the FULL, unpruned AST of every
                    document — with a per-node `await interruptAndCheck(cancelToken)`, unlike
                    bbj-linker.ts:47-58's link(), which already calls `treeIter.prune()` to skip
                    external-document private-member subtrees; collectLocalSymbols has no
                    equivalent isExternalDocument-aware pruning. Both mechanisms scale with total
                    multi-project workspace size, not the referencing/active file's own size.
                    Checked what documented mitigations are present: bbj-index-manager.ts:14-27's
                    isAffected() override is a PRESENT, PARTIAL mitigation — it skips rebuilding
                    external documents when only non-external URIs changed — but this only
                    reduces rebuild frequency; it does not address either of the two request-time
                    costs above, which remain ABSENT any mitigation.
failure_scenario:  A multi-project workspace with many external/referenced BbjClass documents
                    loaded: every `::file::Class` scope resolution rescans the entire
                    cross-project index, and every document load/rebuild walks its full AST
                    including any external project's documents with no pruning — CPU cost scales
                    with total multi-project workspace size rather than the active file's own
                    size, consistent with #232's reported symptom.
classification:    major
                    (1) touches 1 file: FAIL — a real fix needs both a cache in bbj-scope.ts and
                    isExternalDocument-aware pruning in bbj-scope-local.ts, two files — (2) no
                    public API/grammar/LSP change: pass — (3) no new dependency: pass — (4)
                    regression-testable with vitest (synthetic multi-document workspace fixture
                    plus timing assertions, per RU-61-01's D3 benchmark precedent): pass — (5)
                    reviewer can name the exact edit (cache getBBjClassesFromFile's per-file
                    lookup keyed by bbjFilePath+doc URI; add isExternalDocument-based pruning to
                    collectLocalSymbols mirroring bbj-linker.ts's treeIter.prune()): pass — (6)
                    severity `high`: FAIL — `major` regardless of the other five tests (D-13's
                    safety gate).
effort:            8
dedup:             none — #232 is not in the frozen 15-issue snapshot because it is not an open
                    GitHub issue (already tracked as roadmap tech debt); names DEBT-01 as the
                    owning requirement so Phase 66 re-triages against this current-code evidence
                    rather than re-deriving it. Checked #83 (project-wide USE statements
                    mechanism, no match — different feature request), #90 (opting files/regions
                    out of linking, no match — this is a performance path, not an opt-out
                    feature), #466 (sibling-type method return mismatches, no match — unrelated
                    dimension) as this unit's plausible neighbours; none match.
disposition:       major-refactor
```

### Not-reproducible dispositions

- **Tier failed: `repro` (D1).** Candidate claim: `getBBjClassesFromFile`'s workspace-configured `prefixes` setting, combined with untrusted `USE`-statement path text and Node's `path.resolve()` traversal (`..`) handling, could let a crafted workspace `.vscode/settings.json` cause the language server to load or index a `.bbj` file outside the intended prefix/workspace root — the same class of workspace-settings-as-attack-surface concern `RU-61-06` recorded as `P61-D1-001` for `interopHost`/`interopPort`. **Reason not recorded as a finding:** confirming this requires tracing whether `BBjWorkspaceManager`'s own file-discovery logic (which actually opens/loads files from `prefixes`) enforces any root constraint of its own — that logic lives in `bbj-ws-manager.ts`, outside this unit's files. This unit's own code (`getBBjClassesFromFile`) only *compares* URIs against an already-populated index; it cannot itself cause an out-of-bounds file read. Referred to `RU-61-05` below.
- **Tier failed: `repro` (D2/D3).** Candidate claim: `bbj-index-manager.ts` inherits `DefaultIndexManager.allElements()`'s element order, which follows workspace file-discovery order (filesystem enumeration) rather than any explicit sort — so in a workspace with two ambiguous same-simple-name entries (e.g. two same-named library members), which one `getElement()`'s first-match picks could differ between runs or platforms. **Reason not recorded as a finding:** confirming an actual differing resolution requires an empirical cross-platform/cross-run comparison, outside this review's single-read sweep; the structural mechanism (no explicit sort, insertion-order-dependent `Map`/array) is traced but the claimed instability is not empirically reproduced.

### Cross-unit referrals

- **RU-61-06** — this unit does **not** re-record the 11 `test/linking.test.ts` "Interop related tests" failures; they are already owned by `RU-61-06` as `P61-D5-001` (their *subject* is the linker, but their *cause* is the unreachable java-interop peer, per D-06's routing table and the finding-ownership rule). Also per the plan's explicit instruction, this unit does not file a finding for the SEC-06/boundary edge probe (whether an unresolved reference caused by an unavailable java-interop peer is distinguishable in code from a genuine resolution failure) — `bbj-scope-local.ts:158-165`'s uniform `javaClass.error` handling is stated in the D2 cell text above as context for `RU-61-06`'s own sweep, not filed here.
- **RU-61-05** — the prefix-path-traversal candidate above (Not-reproducible dispositions, D1) depends on whether `bbj-ws-manager.ts`'s document-loading logic constrains file discovery from `prefixes` to a safe root; `RU-61-05` owns that file and should confirm or record its own finding.

## RU-61-04 — LSP feature providers

**Files (11 / 1,825 LOC):**
- `bbj-vscode/src/language/bbj-completion-provider.ts` (818)
- `bbj-vscode/src/language/bbj-hover.ts` (210)
- `bbj-vscode/src/language/bbj-signature-help-provider.ts` (123)
- `bbj-vscode/src/language/bbj-definition-provider.ts` (58)
- `bbj-vscode/src/language/bbj-document-symbol-provider.ts` (183)
- `bbj-vscode/src/language/bbj-semantic-token-provider.ts` (35)
- `bbj-vscode/src/language/bbj-inlay-hint-provider.ts` (155)
- `bbj-vscode/src/language/bbj-code-action-provider.ts` (111)
- `bbj-vscode/src/language/bbj-comment-provider.ts` (56)
- `bbj-vscode/src/language/bbj-node-kind.ts` (57)
- `bbj-vscode/src/language/bbj-use-insert.ts` (19)

**Risk rank:** 5 of 7 Phase 61 units — the largest file count in the phase; user-facing on every keystroke. The D-06 routing table's `bbj-document-symbol-provider.ts` unused-eslint-disable warnings (D4) are routed here.
**Sweep method (D-08):** full read.
**Owning plan:** 61-05.

### Cells
- D1 Security — pending
- D2 Correctness & error handling — pending
- D3 Performance & resource use — pending
- D4 Maintainability & code smells — pending
- D5 Test coverage gaps — pending
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — n/a — "This code is part of the single language-server binary (`out/language/main.cjs`) loaded identically by both VS Code and IntelliJ via LSP4IJ; there is no second, divergent implementation to compare it against, so no cross-IDE parity finding is obtainable here."
- D8 Comment & doc accuracy — pending

### Findings
_(none recorded)_

### Not-reproducible dispositions
_(none recorded)_

### Cross-unit referrals
_(none recorded)_

## RU-61-05 — Server lifecycle, DI wiring & workspace management

**Files (9 / 1,433 LOC):**
- `bbj-vscode/src/language/main.ts` (189)
- `bbj-vscode/src/language/bbj-module.ts` (210)
- `bbj-vscode/src/language/bbj-ws-manager.ts` (293)
- `bbj-vscode/src/language/bbj-document-builder.ts` (412)
- `bbj-vscode/src/language/bbj-notifications.ts` (52)
- `bbj-vscode/src/language/logger.ts` (68)
- `bbj-vscode/src/language/constants.ts` (1)
- `bbj-vscode/src/language/utils.ts` (0)
- `bbj-vscode/src/language/composer-commands.ts` (208)

**Risk rank:** 6 of 7 Phase 61 units — server bootstrap and workspace lifecycle. Note for the owning plan: `constants.ts` (1 line) and `utils.ts` (0 lines) are effectively empty — a plausible D4 dead/vestigial-module finding is flagged here for confirmation, not asserted. This unit also owns `RU-61-06`'s `P61-D1-001`/`P61-D1-002` cross-unit referral above (`bbj-ws-manager.ts:53-55`, `main.ts:151-152`).
**Sweep method (D-08):** full read.
**Owning plan:** 61-06.

### Cells
- D1 Security — pending
- D2 Correctness & error handling — pending
- D3 Performance & resource use — pending
- D4 Maintainability & code smells — pending
- D5 Test coverage gaps — pending
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — n/a — "This code is part of the single language-server binary (`out/language/main.cjs`) loaded identically by both VS Code and IntelliJ via LSP4IJ; there is no second, divergent implementation to compare it against, so no cross-IDE parity finding is obtainable here."
- D8 Comment & doc accuracy — pending

### Findings
_(none recorded)_

### Not-reproducible dispositions
_(none recorded)_

### Cross-unit referrals
_(none recorded)_

## RU-61-07 — Builtin catalogs

**Files (8 / 3,752 LOC: 4 `.ts` + 4 `.bbl`):**
- `bbj-vscode/src/language/lib/events.ts` (734)
- `bbj-vscode/src/language/lib/functions.ts` (995)
- `bbj-vscode/src/language/lib/labels.ts` (67)
- `bbj-vscode/src/language/lib/variables.ts` (86)
- `bbj-vscode/src/language/lib/events.bbl` (732)
- `bbj-vscode/src/language/lib/functions.bbl` (993)
- `bbj-vscode/src/language/lib/labels.bbl` (61)
- `bbj-vscode/src/language/lib/variables.bbl` (84)

**Risk rank:** 7 of 7 Phase 61 units — static builtin-verb/function/label/variable data catalogs with no dynamic behavior; lowest behavioral risk in the phase despite the largest LOC total in the inventory.
**Sweep method (D-08):** mechanical — a programmatic diff of each `.ts`/`.bbl` pair for the D4 duplication finding, and D2 by a stated sampling protocol (sample size and source consulted recorded in the cell by the owning plan).
**Owning plan:** 61-07.

### Cells
- D1 Security — pending
- D2 Correctness & error handling — pending
- D3 Performance & resource use — pending
- D4 Maintainability & code smells — pending
- D5 Test coverage gaps — pending
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — n/a — "This code is part of the single language-server binary (`out/language/main.cjs`) loaded identically by both VS Code and IntelliJ via LSP4IJ; there is no second, divergent implementation to compare it against, so no cross-IDE parity finding is obtainable here."
- D8 Comment & doc accuracy — pending

### Findings
_(none recorded)_

### Not-reproducible dispositions
_(none recorded)_

### Cross-unit referrals
_(none recorded)_

### File-exception cells

- [file-exception] lib/events.bbl · D1 — n/a — "`.bbl` files are static builtin-verb/function/label/variable data catalogs with no executable logic, no hot path, and no isolated regression-test surface of their own; content accuracy is assessed under D2 (values correct) and D4 (duplication against the `.ts` sibling), not under this dimension."
- [file-exception] lib/events.bbl · D2 — pending
- [file-exception] lib/events.bbl · D3 — n/a — "`.bbl` files are static builtin-verb/function/label/variable data catalogs with no executable logic, no hot path, and no isolated regression-test surface of their own; content accuracy is assessed under D2 (values correct) and D4 (duplication against the `.ts` sibling), not under this dimension."
- [file-exception] lib/events.bbl · D4 — pending
- [file-exception] lib/events.bbl · D5 — n/a — "`.bbl` files are static builtin-verb/function/label/variable data catalogs with no executable logic, no hot path, and no isolated regression-test surface of their own; content accuracy is assessed under D2 (values correct) and D4 (duplication against the `.ts` sibling), not under this dimension."
- [file-exception] lib/events.bbl · D6 — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- [file-exception] lib/events.bbl · D7 — n/a — "This code is part of the single language-server binary (`out/language/main.cjs`) loaded identically by both VS Code and IntelliJ via LSP4IJ; there is no second, divergent implementation to compare it against, so no cross-IDE parity finding is obtainable here."
- [file-exception] lib/events.bbl · D8 — n/a — "`.bbl` catalogs are raw data files with no comments or docstrings to go stale; doc-accuracy review targets the `.ts` sibling files and `CLAUDE.md`/`VERBs.md` instead."
- [file-exception] lib/functions.bbl · D1 — n/a — "`.bbl` files are static builtin-verb/function/label/variable data catalogs with no executable logic, no hot path, and no isolated regression-test surface of their own; content accuracy is assessed under D2 (values correct) and D4 (duplication against the `.ts` sibling), not under this dimension."
- [file-exception] lib/functions.bbl · D2 — pending
- [file-exception] lib/functions.bbl · D3 — n/a — "`.bbl` files are static builtin-verb/function/label/variable data catalogs with no executable logic, no hot path, and no isolated regression-test surface of their own; content accuracy is assessed under D2 (values correct) and D4 (duplication against the `.ts` sibling), not under this dimension."
- [file-exception] lib/functions.bbl · D4 — pending
- [file-exception] lib/functions.bbl · D5 — n/a — "`.bbl` files are static builtin-verb/function/label/variable data catalogs with no executable logic, no hot path, and no isolated regression-test surface of their own; content accuracy is assessed under D2 (values correct) and D4 (duplication against the `.ts` sibling), not under this dimension."
- [file-exception] lib/functions.bbl · D6 — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- [file-exception] lib/functions.bbl · D7 — n/a — "This code is part of the single language-server binary (`out/language/main.cjs`) loaded identically by both VS Code and IntelliJ via LSP4IJ; there is no second, divergent implementation to compare it against, so no cross-IDE parity finding is obtainable here."
- [file-exception] lib/functions.bbl · D8 — n/a — "`.bbl` catalogs are raw data files with no comments or docstrings to go stale; doc-accuracy review targets the `.ts` sibling files and `CLAUDE.md`/`VERBs.md` instead."
- [file-exception] lib/labels.bbl · D1 — n/a — "`.bbl` files are static builtin-verb/function/label/variable data catalogs with no executable logic, no hot path, and no isolated regression-test surface of their own; content accuracy is assessed under D2 (values correct) and D4 (duplication against the `.ts` sibling), not under this dimension."
- [file-exception] lib/labels.bbl · D2 — pending
- [file-exception] lib/labels.bbl · D3 — n/a — "`.bbl` files are static builtin-verb/function/label/variable data catalogs with no executable logic, no hot path, and no isolated regression-test surface of their own; content accuracy is assessed under D2 (values correct) and D4 (duplication against the `.ts` sibling), not under this dimension."
- [file-exception] lib/labels.bbl · D4 — pending
- [file-exception] lib/labels.bbl · D5 — n/a — "`.bbl` files are static builtin-verb/function/label/variable data catalogs with no executable logic, no hot path, and no isolated regression-test surface of their own; content accuracy is assessed under D2 (values correct) and D4 (duplication against the `.ts` sibling), not under this dimension."
- [file-exception] lib/labels.bbl · D6 — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- [file-exception] lib/labels.bbl · D7 — n/a — "This code is part of the single language-server binary (`out/language/main.cjs`) loaded identically by both VS Code and IntelliJ via LSP4IJ; there is no second, divergent implementation to compare it against, so no cross-IDE parity finding is obtainable here."
- [file-exception] lib/labels.bbl · D8 — n/a — "`.bbl` catalogs are raw data files with no comments or docstrings to go stale; doc-accuracy review targets the `.ts` sibling files and `CLAUDE.md`/`VERBs.md` instead."
- [file-exception] lib/variables.bbl · D1 — n/a — "`.bbl` files are static builtin-verb/function/label/variable data catalogs with no executable logic, no hot path, and no isolated regression-test surface of their own; content accuracy is assessed under D2 (values correct) and D4 (duplication against the `.ts` sibling), not under this dimension."
- [file-exception] lib/variables.bbl · D2 — pending
- [file-exception] lib/variables.bbl · D3 — n/a — "`.bbl` files are static builtin-verb/function/label/variable data catalogs with no executable logic, no hot path, and no isolated regression-test surface of their own; content accuracy is assessed under D2 (values correct) and D4 (duplication against the `.ts` sibling), not under this dimension."
- [file-exception] lib/variables.bbl · D4 — pending
- [file-exception] lib/variables.bbl · D5 — n/a — "`.bbl` files are static builtin-verb/function/label/variable data catalogs with no executable logic, no hot path, and no isolated regression-test surface of their own; content accuracy is assessed under D2 (values correct) and D4 (duplication against the `.ts` sibling), not under this dimension."
- [file-exception] lib/variables.bbl · D6 — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- [file-exception] lib/variables.bbl · D7 — n/a — "This code is part of the single language-server binary (`out/language/main.cjs`) loaded identically by both VS Code and IntelliJ via LSP4IJ; there is no second, divergent implementation to compare it against, so no cross-IDE parity finding is obtainable here."
- [file-exception] lib/variables.bbl · D8 — n/a — "`.bbl` catalogs are raw data files with no comments or docstrings to go stale; doc-accuracy review targets the `.ts` sibling files and `CLAUDE.md`/`VERBs.md` instead."
