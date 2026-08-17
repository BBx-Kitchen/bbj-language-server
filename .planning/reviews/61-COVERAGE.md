# Phase 61 Coverage — bbj-vscode/src/language/ (RVW-01, SEC-06)

**Swept tree:** branch `v4.0-stability-and-quality` at commit `62b1e7150b91eadf6300db62103ef638c41ab25c` — recorded once for the whole phase (D-15); not re-anchored per plan, so every plan in this file describes the same tree.

**Governing standard:** `.planning/reviews/INVENTORY.md` — the single immutable contract for Phases 61-69. Not edited by this phase.

**Dedup source:** INVENTORY's Frozen Open-Issue Snapshot (15 issues, queried 2026-08-17 via `gh issue list --state open --limit 60`). Phase 69 re-queries the tracker live immediately before filing, so this snapshot is not re-verified live at sweep time.

**Slice size:** 7 unit rows + 4 `.bbl` file-exception rows = 11 rows × 8 dimensions = **88 cells** (**50** `applies`, **38** `n/a`).

## Stopping Rule & Write Contract

**Stopping rule.** A unit's sweep is complete when: (i) each of its 6 live `applies` cells carries a verdict (`pass`/`fail`) plus a written line naming the concrete checks applied; (ii) every file in the unit's file list is named at least once inside that unit's own section — in a check line or in a finding's `location:` — so coverage is file-granular, not merely unit-granular; and (iii) every candidate claim raised during the sweep is either promoted to a finding record clearing its evidence tier, or written under that unit's Not-reproducible-dispositions heading (below) with its reason. Once (i)-(iii) hold, the unit is done; no further reading is licensed.

**Write contract.** Plans `61-02`..`61-07` each fill exactly one unit section below and touch nothing else — no fragment files, no assembly plan, no whole-file rewrite, and no rewording of a carried-forward `n/a` reason (D-03). Ordering across this shared file is enforced structurally by the wave dependency chain (D-04), not by an assumption about executor behavior: one plan per wave, waves 1-7, each plan's `depends_on` naming its predecessor in D-02's risk-rank order.

**Placeholder.** Every not-yet-recorded live-dimension cell line ends with the single lowercase word `pending`. This is mechanically checkable at every wave.

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
- D4 Maintainability & code smells — pending
- D5 Test coverage gaps — pending
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — n/a — "This code is part of the single language-server binary (`out/language/main.cjs`) loaded identically by both VS Code and IntelliJ via LSP4IJ; there is no second, divergent implementation to compare it against, so no cross-IDE parity finding is obtainable here."
- D8 Comment & doc accuracy — pending

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

### Not-reproducible dispositions

- **Tier failed: `repro` (D1).** Candidate claim: unescaped Markdown/HTML syntax in peer-supplied Javadoc text (`java-interop.ts:638-643`) achieves script injection in the rendered hover/completion UI. **Reason not recorded as a finding:** confirming this requires the renderer's `MarkupKind`/`supportHtml` configuration, which lives in `RU-61-04` (`bbj-hover.ts`, `bbj-completion-provider.ts`) — outside this unit's files and out of scope for a `RU-61-06` sweep. The unbounded/unescaped *content* flowing into `DocumentationInfo.javadoc` is still recorded as `P61-D1-002`; the stronger claim of confirmed HTML/script execution in the IDE is not asserted without that additional evidence, which `RU-61-04`'s own sweep is positioned to supply.

### Cross-unit referrals

- **RU-61-05** — `bbj-ws-manager.ts:53-55` and `main.ts:151-152` supply `interopHost`/`interopPort` from `initializationOptions`/`didChangeConfiguration` with only a falsy-check default (`|| 'localhost'`, `|| 5008`), the same gap this unit's `setConnectionConfig` (`java-interop.ts:116-120`, `P61-D1-001`) does not close. `RU-61-05`'s own D1/D2 sweep should confirm whether either call site adds validation this unit does not see, or record its own finding if not.

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
