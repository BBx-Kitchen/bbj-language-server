# Phase 101: BBj Parser Endpoint in `bbj-ls` - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-22
**Phase:** 101-bbj-parser-endpoint-in-bbj-ls
**Areas discussed:** Wire contract, Referenced-program resolution, Version identity & supersession, Verification & delivery

---

## Pending todos (cross-reference)

| Option | Description | Selected |
|--------|-------------|----------|
| None — all reviewed, none folded | Same disposition as Phase 100; IntelliJ lifecycle, Node download, test-harness and A2 items | ✓ |
| linking.test.ts interop failures | Test-harness todo | |
| Loosen single-line IF balance rule | A2 residue in line-break-validation.ts | |
| IntelliJ server-lifecycle pair | Lost-connection crash detection + stale status log | |

**User's choice:** None folded.

---

## Wire contract

### Placement

| Option | Description | Selected |
|--------|-------------|----------|
| New @JsonRequest on InteropService | Bare-name method next to getClassInfo/getAllClassNames; an older bbj-ls answers MethodNotFound, the probe the TS client already latches | ✓ |
| Separate service object, same launcher | Dedicated class registered via setLocalServices; same wire and probe | |
| Explicit capability request + parse method | getCapabilities first; more ceremony than PSRV-04 asks for | |

### Request

| Option | Description | Selected |
|--------|-------------|----------|
| text + canonical name + version token | Full text, the document's canonical name, a client-chosen version identity echoed back | ✓ |
| Same, plus a reserved typeChecking flag | Defaults false; keeps the shape stable for PSRV-10 | |
| Same, plus password for protected programs | Only if users edit protected sources | |

### Response

| Option | Description | Selected |
|--------|-------------|----------|
| Errors only, as typed DTOs | List of {category, message, position fields} plus echoed version | ✓ |
| Errors DTOs + the raw program JSON string | Full doJSONSerialization() output attached for future features | |
| Raw program JSON only | Pass-through; the wire contract becomes BBj's internal JSON schema | |

### Coordinates

| Option | Description | Selected |
|--------|-------------|----------|
| BBj's editor fields verbatim, documented | Editor start/end line and character positions as the JSON proxy emits them; the one tested conversion is Phase 102's | ✓ |
| Convert to zero-based LSP ranges on the server | LSP-ready ranges from the server; conversion not testable against document text | |
| Both | Two sources of truth | |

**User's choice:** all four recommended options. **Notes:** none; "Next area" after the first round.

---

## Referenced-program resolution

### Prefix source

| Option | Description | Selected |
|--------|-------------|----------|
| In every request, resolved by the LS | PREFIX directories and workspace roots the LS already computes; stateless endpoint, nothing read from config.bbx on the server | ✓ |
| Config path only; the server reads PREFIX itself | setConfig with the resolved config.bbx path, BBj parses PREFIX and embedded USE | |
| Both | Directories for lookup, config path for setConfig | |

### Lookup order

| Option | Description | Selected |
|--------|-------------|----------|
| Active document's directory → workspace roots → PREFIX in order | Mirrors BBj's rule with the IDE's roots in front of PREFIX; first hit wins; absolute paths as-is | ✓ |
| PREFIX in order → workspace roots → active document's directory | Strict BBj precedence first | |
| Workspace roots only, no PREFIX | A program that USEs something under a PREFIX outside the workspace fails on the reference | |

### Missing reference

| Option | Description | Selected |
|--------|-------------|----------|
| BBj's own error, as a normal error DTO | Faithful to bbjcpl; severity is client policy (Phase 103) | ✓ |
| Swallow it: hand BBj an empty program | No diagnostic for missing references in the fast pass | |
| Separate 'unresolved references' list | Kept out of the errors list | |

### Overlay

| Option | Description | Selected |
|--------|-------------|----------|
| Disk only for referenced programs | Exactly PSRV-02's wording; smallest request | ✓ |
| Optional overlay map of other open documents' text | More faithful for multi-file edits, larger requests | |
| No referenced programs in the fast pass at all | Criterion 2 requires context parsing | |

**User's choice:** all four recommended options. **Notes:** "Next area".

---

## Version identity & supersession

### Latest wins

| Option | Description | Selected |
|--------|-------------|----------|
| Server drops it: latest-wins per connection and document | Fresh ProgramSource UUID per request; queued older never parsed; in-flight older's result discarded | ✓ |
| Server answers every request in order, tagged with its version | Client discards stale answers; every keystroke burst parsed | |
| Client cancels via $/cancelRequest, server honours the token | Guarantee lives on the client side | |

### Failure channel

| Option | Description | Selected |
|--------|-------------|----------|
| JSON-RPC errors with distinct codes | Superseded → RequestCancelled; exception/protected/missing class → application code with message; never an errors-list entry | ✓ |
| Result DTO with a status field | {status: ok/superseded/failed, message, errors, version} | |
| Both | Status in the result and a JSON-RPC error for hard failures | |

### Threads

| Option | Description | Selected |
|--------|-------------|----------|
| One parser worker per connection | One editor serialized on one thread; several editors in parallel; makes latest-wins a simple queue | ✓ |
| One global parser worker for the whole service | Bounds CPU strictly; one large document delays every editor | |
| Bounded pool shared by all connections | Only once the parser is proven thread-safe | |

### Guards

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed defaults, overridable by system property | ~10 s timeout, low-MB size cap, -Dbbj.interop.* like the verbose flag | ✓ |
| Client-side timeout only, no server guards | PSRV-08 already requires a client timeout | |
| Hard-coded limits, not configurable | Fewer knobs; change means a new build | |

**User's choice:** all four recommended options. **Notes:** the parser's thread-safety is flagged for research.

---

## Verification & delivery

### Client

| Option | Description | Selected |
|--------|-------------|----------|
| JUnit 5 integration test in bbj-ls, gated on a reachable :5008 | lsp4j client against a running BBjServices; older-server probe against an in-process launcher lacking the method; skipped when nothing listens | ✓ |
| A main-class CLI shipped in bbj-ls | Prints errors for a file; evidence by reading output | |
| Throwaway Node script in the scratchpad | Nothing tracked | |

### Build deps

| Option | Description | Selected |
|--------|-------------|----------|
| Offline: install the local /opt/bbx/.lib jars into a local Maven repo | install-file for BBjStartup.jar and ParserServiceAPI.jar from the running 26.02; ParserServiceAPI added as provided | ✓ |
| You provide BASIS Nexus credentials | Resolves as on BASIS machines; trunk-SNAPSHOT may be newer than the local runtime | |
| Both | Two build paths | |

### Restart

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, freely — it is a dev container | Copy jar, restart via /opt/bbx/bin, keep the 26.02 jar as backup | ✓ |
| Ask before every restart | Each deploy a human checkpoint | |
| Never; you deploy and restart by hand | Executors stop at 'jar built' | |

### Done

| Option | Description | Selected |
|--------|-------------|----------|
| Branch off develop + MR opened on BASIS GitLab, verified locally | Named after a GitHub issue of this repo as feat/447 was (file one); MR text states the contract; merge is BASIS's call | ✓ |
| MR merged into develop before the phase closes | Phases 102-104 wait with it | |
| Local branch only, no push | User pushes and opens the MR | |

**User's choice:** all four recommended options. **Notes:** "Done with this area"; then "I'm ready for context".

---

## Claude's Discretion

- Exact method and DTO names (proposal recorded in CONTEXT.md), whether interpreter line fields ride along.
- Error-code numbers and names; size-cap default; worker queue implementation; ServiceLoader vs direct construction of the parser service; program-factory lifetime.
- Test names, fixture programs, skip-gate spelling; plan split and order.

## Deferred Ideas

- Reserved typeChecking flag / PSRV-10 slow pass; password for protected programs; raw program JSON on the wire; overlay of other open documents; explicit capability request; in-repo java-interop/ mirror; harness JSON-RPC client (Phase 104).
