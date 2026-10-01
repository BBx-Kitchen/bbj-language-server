# Phase 124: Interop Client - Context

**Gathered:** 2026-10-01
**Status:** Ready for planning

<domain>
## Phase Boundary

The language server can call bbj-ls `formatProgram` (whole document and range) and `denumProgram`
over the :5008 interop connection and gets a typed, validated outcome back (INT-01..INT-05).
Format and DENUM traffic never delays or resets live `parseProgram` diagnostics, never disables
another method, and never trips the circuit breaker.

This phase is the client layer only: wire types, error-code constants, the format/DENUM lane, the
per-method availability latches, one shared error classifier, response validation, test doubles
and live harness cases. No user-visible change: no `lsp.Formatter`, no formatting handler, no
`bbj/denum` request, no user messages (those are Phases 125/126).

</domain>

<decisions>
## Implementation Decisions

### Carried forward (v4.9 decisions in STATE.md — not re-asked)
- Hard cut-over: no fallback to `BBjCFCli.jar` or bbjlst denumbering; BBj < 26.03 eventually
  gets a "requires BBj 26.03 or later" message (wording is Phase 125/126).
- bbj-ls is not changed in this milestone; anything it should change is drafted as a bbj-ls issue.
- DENUM and formatting both edit the **open editor buffer in place** — never the file on disk —
  each as one undoable edit; "Denumber and Format" is one request with `allowDenum` and therefore
  one undo step (user re-stated this during the discussion; it is the plan).
  Consequence for this phase: every client call takes the live text as a parameter and never reads
  the file from disk; `FormatProgramParams` carries `allowDenum` (typed, optional) so Phase 126 can
  use it.

### Route (format/DENUM lane)
- **D-01:** `formatProgram` and `denumProgram` travel over a **third, dedicated connection** (a
  "program lane" for format+DENUM only), opened lazily like the parse lane. The parse lane stays
  exclusive to `parseProgram`; format/DENUM never use it. Rationale: bbj-ls gives each TCP
  connection its own parser and format workers, so DENUM never queues behind a live parse, and
  class-info traffic on the shared reader thread (#692) never delays it.
  — **Reversibility:** costly — the lane bookkeeping, tests and harness measurement are built
  around a separate socket.
- **D-02:** **Commit, then confirm.** Build the dedicated lane now. The live harness measures
  DENUM latency (a) behind a pending parse on the parse lane as the baseline and (b) on the
  dedicated lane while a parse is pending, plus live-parse latency while DENUM runs. The numbers
  and the route decision are recorded in the phase (SUMMARY/VERIFICATION). Change course only if
  the dedicated lane measures worse.
- **D-03:** Acceptance threshold: **no queueing behind parse.** DENUM latency on the dedicated lane
  with a pending parse stays close to its idle latency, and live parse latency is unchanged while
  DENUM runs. Record the numbers; there is no fixed millisecond bar.
- **D-04:** **No fallback** to the shared connection. If the dedicated lane cannot be opened, the
  call returns a typed "not reachable"/unavailable outcome. The breaker is never touched (no
  `connect()` path, no `notifyJavaConnectionError`).
- **D-05:** **Reopen on the next request, with a short cool-down.** A failed open does not latch for
  the whole generation; the next format/DENUM request tries again, rate-limited so a burst of
  format-on-save requests does not hammer :5008.
- **D-06:** **Lane loss resets only its own state.** The format/DENUM lane keeps its own lane
  generation; losing it re-probes only the `formatProgram`/`denumProgram` latches and **never
  bumps the shared `generation`** (live parse verdicts survive — SC2). A shared-generation bump
  (reconnect, `clearCache()`) also resets the format/DENUM latches, so each method is probed again
  on the next connection (SC3).

### Timeout & cancellation
- **D-07:** **Client backstop above bbj-ls:** a named client deadline of 15 s (bbj-ls's own
  format/parse timeouts are 10 s). On expiry the client **always cancels** (`$/cancelRequest` via
  the token passed to `sendRequest`) — never abandons like `requestClassInfo`'s `Promise.race` —
  and returns a typed `timeout` outcome. Never classified as a transport failure.
  **Refined 2026-10-01 after code review:** the deadline is per request kind — 15 s for
  whole-document format, range format and DENUM; 25 s for a `formatProgram` with
  `allowDenum: true` (bbj-ls runs a DENUM step of up to 10 s plus a format step of up to 10 s).
  Same cancel-always behaviour.
- **D-08:** The caller's `CancellationToken` is forwarded to `sendRequest`; a caller cancellation
  and a peer `-32800` both yield a typed `cancelled` outcome, never logged as a failure, never fed
  to any latch or breaker. The live harness checks whether bbj-ls honours `$/cancelRequest` and
  records the finding (open research gap).
- **D-09:** A `-33002` caused by a previous overrunning request is a **plain typed `timeout`**; no
  lane recycling. The dedicated lane already keeps an overrun away from live parse.

### Classifier scope
- **D-10:** **One shared classifier module** for every bbj-ls code (`-33001`..`-33009`, `-32601`,
  `-32602`, `-32800`, plus transport/`ConnectionError`/breaker-open). `BBjParserService` migrates
  to it **behaviour-identical**: same kind tokens (`parser-exception`, `timeout`, `size-cap`,
  `service-unavailable`, `protected-program`, `transport`, `malformed-result`), same warn-then-debug
  cadence, guarded by the existing `bbj-parser-service.test.ts` / `java-interop-parse-lane.test.ts`.
  — **Reversibility:** reversible.
- **D-11:** **Per-method availability latches live in the interop client** (INT-03), one per
  method: `unknown → available | unavailable`, keyed on lane generation and shared generation
  (D-06). The first real call is the probe (no capability request, no version parsing — the
  `BBjParserService` precedent). `-32601` latches only that method's state `unavailable`; any other
  answer latches `available`. A latched `unavailable` answers immediately without a round trip.
  `-33004` stays a typed `service-unavailable` outcome (not a latch), since it can be transient or
  "closing connection".
- **D-12:** Error `data` becomes a **validated, typed payload**:
  `{kind:'invalid-settings', problems:[{setting,message}]}` for `-33007`,
  `{kind:'mixed-numbering', line}` for `-33008`. Payloads are bounded and sanitised like any peer
  input; malformed `data` still yields the kind with an empty payload. Application errors are
  converted into outcomes, never rethrown (Pitfall 21: rebuilding a `ResponseError` loses `data`).

### Validation bounds (INT-05)
- **D-13:** **Contract-exact shape check against the request:**
  - whole-document `formatProgram` → `text` present, `edits` absent;
  - range `formatProgram` → `edits` present with 0 or 1 entry, integer non-negative positions,
    inside the document and overlapping the requested lines; `text` absent;
  - `denumProgram` → `text` string, `denumbered` boolean;
  - the echoed `version` must equal the version sent (stale answers rejected here).
  Anything else → typed `malformed-result`; it never reaches an editor.
- **D-14:** **Text size cap, relative and absolute:** returned `text` ≤ 4× request text + 64 KiB,
  and never above 16 MiB. Named constants in the guard module.
- **D-15:** **Diagnostics sanitised `java-peer-guard.ts`-style:** count capped (~500), messages
  truncated and control characters stripped, treated as plain text; lines must be integers; `0`
  is kept as "no location" (the bbj-ls contract's meaning — never coerced to 1); negative,
  non-integer or out-of-range entries are dropped individually without failing the whole result.
  (Refined after research, 2026-10-01.)
- **D-16:** A malformed answer is a typed `malformed-result` outcome, logged at warn **once per kind
  per connection generation**, then at debug (the `BBjParserService` cadence). User messages are
  Phase 125/126's job.

### Live test vehicle (decided after research, 2026-10-01)
- **D-17:** The live checks (SC1 format whole/range + DENUM, SC2 DENUM-latency measurement on the
  parse lane vs the dedicated lane, the `$/cancelRequest` check) live in a vitest live file
  (`bbj-vscode/test/functional/program-live.test.ts`) that runs through the real
  `JavaInteropService` client behind `RUN_BBJ_TESTS`, probes first and skips on `-32601`, and
  records the measured numbers. The 17-case interop harness CLI is not extended; SC1's "interop
  harness" is read as "the live interop test path".

### Claude's Discretion
- `socket.setNoDelay(true)` on the new lane's socket only (research measured ~82 ms → ~42 ms for
  small sequential requests).
- Module split and names (e.g. a program wire-types file, an error-classifier module, a program
  peer guard alongside `java-peer-guard.ts`), the exact outcome union shape, and the lane's
  bookkeeping fields, within D-01..D-16.
- The exact cool-down length for D-05 and the exact diagnostic count/length caps for D-15.
- Neutral wording for the existing parse-lane warning text if it is shared code.
- How `JavaInteropTestService` scripts the two new methods (it must cover every outcome; see
  Specifics) and how the harness reaches the language server's client for SC1.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### bbj-ls wire contract
- `/home/coder/repos/bbj-ls/README.md` — "JSON-RPC methods": `formatProgram`, `denumProgram`
  request/response tables, the error-code table (`-33001`..`-33009`, `-32602`, `-32800`),
  supersession by `canonicalName`, per-connection parser/format workers, limits
  (`bbj.interop.parse.maxBytes` 4 MiB, `*.timeoutMs` 10000), and the Types table
  (`FormatProgramResult`, `DenumProgramResult`, `ProgramDiagnostic`).
- `/home/coder/repos/bbj-ls/bbj-ls-formatter/README.md` — "Settings reference" (the 15 keys; used
  by Phase 125, but `settings` is a typed field in this phase's params).

### Milestone research
- `.planning/research/SUMMARY.md` — Conflict 1 (lane routing; resolved here as D-01), open gaps
  (`$/cancelRequest` behaviour).
- `.planning/research/PITFALLS.md` — Pitfalls 7 (supersession/-32800), 8 (three clocks, never
  abandon), 9 (breaker/generation/lane coupling), 10 (per-method `-32601`), 19 (trusting peer
  shape), 20 (hermetic tests that miss the contract), 21 (`data` lost on rethrow).
- `.planning/research/ARCHITECTURE.md` — §2 lane options (note: this phase chose the dedicated
  lane, not ARCHITECTURE's parse-lane recommendation), §3 probing/latch precedent and error table.

### Project planning
- `.planning/ROADMAP.md` — Phase 124 goal, success criteria 1-5, "Where each phase works".
- `.planning/REQUIREMENTS.md` — INT-01..INT-05.
- `.planning/STATE.md` — v4.9 standing decisions (lines ~205-208).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bbj-vscode/src/language/java-interop-connection.ts` — the parse lane (`parseLane`,
  `parseLaneGeneration`, `parseLaneConnecting`, `parseLaneRetiredGeneration`,
  `parseLaneConnection()`, `openParseLane`) is the template for the format/DENUM lane's lazy open
  and same-tick promise sharing; `parseProgramRequest` shows the `RequestType` pattern.
  `disconnect()`/`clearCache` already dispose the parse lane — the new lane must be disposed there
  too.
- `bbj-vscode/src/language/bbj-parser-service.ts` — `APPLICATION_ERROR_KINDS`,
  `classifyFailureKind`, `MALFORMED_RESULT_KIND`, the `'unknown'|'on'|'off'` probe latch keyed on
  `connectionGeneration`, and the warn-then-debug failure cadence. The classifier moves out of here
  (D-10).
- `bbj-vscode/src/language/java-peer-guard.ts` — `truncateText`, `TRUNCATION_MARKER`,
  `MAX_PEER_ERROR_LENGTH` and the sanitising style for D-15.
- `bbj-vscode/src/language/java-interop.ts` — `JavaInteropService` front; `parseProgram` is a plain
  delegate. Add `formatProgram`/`denumProgram` delegates beside it.

### Established Patterns
- First real call is the probe; `MethodNotFound` latches off for the generation; generation bump
  re-probes (`BBjParserService`).
- Breaker only ever moves from `connect()` (`onConnectAttemptSettled`); application `ResponseError`s
  never reach it. Keep it that way for the new lane (D-04).
- `requestClassInfo` races a 10 s timer and abandons the request — do NOT copy (D-07).

### Integration Points
- Test doubles: `bbj-vscode/test/bbj-test-module.ts` (`JavaInteropTestService` —
  `scriptParseProgram` defaults to `method-not-found`; mirror scripting for the two new methods),
  `bbj-vscode/test/fake-interop-peer.ts` (`FakePeerInteropService`, real `MessageConnection` path;
  add `formatProgram`/`denumProgram` cases and a method-missing switch per method).
- Existing guards to keep green: `java-interop-parse-lane.test.ts`, `java-interop-connection.test.ts`,
  `java-interop-breaker.test.ts`, `java-interop-timeouts.test.ts`, `bbj-parser-service.test.ts`,
  `java-interop-peer-guard.test.ts`.
- Interop harness: `bbj-vscode/tools/interop-test-harness/cases.ts` currently covers the 4
  class-info RPC methods only; SC1/SC2 need new live cases (format whole/range, DENUM, latency
  under a pending parse, `$/cancelRequest` check).

</code_context>

<specifics>
## Specific Ideas

- Test-double coverage must script every outcome, not just success: success `text`, success
  `edits` (0 and 1), `denumbered: false`, `-33001..-33009` (with `-33007`/`-33008` `data`),
  `-32601` per method independently, `-32602`, `-32800`, a delayed answer past the backstop, and
  malformed results (both/neither of `text`/`edits`, oversized text, out-of-range edit, wrong
  `version` echo).
- SC4 test: a burst of application errors leaves `connectionGeneration`, breaker state and the
  live-parse latch untouched, and Java class completion/hover still work.
- SC3 test: a peer answering `-32601` for only `formatProgram` (or only `denumProgram`) keeps live
  parse and the other method working; both re-probe after a generation bump.
- Live tests stay behind `RUN_BBJ_TESTS`; they probe first and skip (not fail) on `-32601`. Use
  `parseHelper`, never `DocumentBuilder.build` (reaches CPL/:5008).
- No planning IDs (D-xx, INT-xx, plan numbers) in source or test comments; issue numbers are fine.

</specifics>

<deferred>
## Deferred Ideas

- `canonicalName` choice and per-document serialization to avoid supersession losing a
  format-on-save (Pitfall 7b) — Phase 125 (the client only forwards whatever `canonicalName` the
  caller passes).
- User-facing messages for each outcome ("requires BBj 26.03", invalid settings, mixed numbering,
  timeouts) — Phases 125/126.

### Reviewed Todos (not folded)
- `2026-09-26-intellij-interop-initoptions-key-mismatch.md` — IntelliJ init-option keys; unrelated
  to the format/DENUM client.
- `2026-09-26-signature-help-and-snippet-peer-name-escaping.md` — class-data peer escaping, not
  format/DENUM.
- `2026-09-27-windows-intellij-node-download-progress-check.md` — Windows UAT check, unrelated.
- `2026-09-29-lsp4j-1-0-with-bbj-ls.md` — dependency upgrade, outside v4.9.
- `2026-09-29-vitest-5-upgrade.md` — dependency upgrade, outside v4.9.
- `2026-09-29-vscode-jsonrpc-9-migration.md` — same file, but PROJECT.md keeps it out of v4.9.

</deferred>

---

*Phase: 124-interop-client*
*Context gathered: 2026-10-01*
