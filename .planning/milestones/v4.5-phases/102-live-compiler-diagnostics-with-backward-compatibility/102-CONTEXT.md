# Phase 102: Live Compiler Diagnostics With Backward Compatibility - Context

**Gathered:** 2026-09-22
**Status:** Ready for planning

<domain>
## Phase Boundary

The language-server client for the `parseProgram` request that Phase 101 added to `bbj-ls`
(the Java service inside BBjServices on port 5008), living in this repository under
`bbj-vscode/src/language/` beside `bbj-cpl-service.ts` and wired into document validation:

1. With a BBjServices whose `bbj-ls` offers the endpoint, the open document's current text is
   sent while the developer types and BBj's own parser errors appear in the editor without a
   save, in VS Code and in IntelliJ alike (PSRV-03).
2. With an older BBj whose `bbj-ls` lacks the endpoint, and with no connection at all, both
   extensions behave exactly as 0.16.x: Java completion through the same socket, the save-time
   `bbjcpl` run, the existing diagnostics — no error, no dialog, no repeated log line. The server
   learns which case it is in by probing the endpoint once per connection, never by comparing
   version strings, and an automated test drives the whole path against a service double that
   lacks the endpoint (PSRV-04).
3. BBj's one-based editor positions become correct zero-based editor ranges for colon
   continuation lines, programs with user line numbers, CRLF files and a last line without a
   trailing newline (PSRV-05).
4. An endpoint exception, a timeout or a BBjServices that is not running is never shown as a
   syntax error in the document; it is visible in the server log only (PSRV-08).
5. The server log states once per connection whether live compiler diagnostics are on, and the
   published documentation of both extensions says the feature needs BBj 26.03 or later
   (PSRV-09).

Requirements: PSRV-03, PSRV-04, PSRV-05, PSRV-08, PSRV-09.

**Changes only this repository**: `bbj-vscode/src/language/` (the client, the document builder
hook, the coordinate converter), `bbj-vscode/test/` (the service double and fixtures), and
`documentation/docs/vscode/` plus `documentation/docs/intellij/`. **No `bbj-intellij/` source
change** — IntelliJ receives the diagnostics through the shared language server. **No `bbj-ls`
change** — the endpoint's contract is fixed by `101-MR-DESCRIPTION.md`.

Not in this phase: de-duplicating the live errors against Langium's own diagnostics or against
the save-time `bbjcpl` run, and standing Langium's lexer/parser/line-break checks down when the
compiler accepts a document (Phase 103, PSRV-06/07); the conformance harness's endpoint mode
(Phase 104); any diagnostic that depends on `USE`/`CALL` reference resolution (Phase 101
override: BBj's parser never invokes the prefix algorithm through this endpoint); the five
critical `101-REVIEW.md` findings in `bbj-ls` (a separate `bbj-ls` follow-up, see D-16); a
status-bar indicator, a popup, or any new setting in either IDE.

</domain>

<decisions>
## Implementation Decisions

### Trigger & settings
- **D-01:** **No new setting.** The live parse hangs off the existing `bbj.compiler.trigger`
  switch (`bbj-document-validator.ts`'s `getCompilerTrigger()`): `off` disables the live parse
  together with `bbjcpl`; `debounced` and `on-save` both enable it whenever the probe says the
  endpoint exists. Neither `package.json` nor the IntelliJ settings UI or initialization
  options change. (Observed during scouting, for the researcher: the server today treats
  `debounced` and `on-save` identically — both run `bbjcpl` on the on-disk file 500 ms after any
  build; only `off` is distinct. This phase does not change that.)
- **D-02:** **Pacing reuses the existing 500 ms trailing-edge debounce** in
  `bbj-document-builder.ts` (`SAVE_DEBOUNCE_MS`, `debouncedCompile`) — the live parse is
  scheduled from the same place and the same quiet period as the `bbjcpl` run, one timer
  mechanism in one place. Anything that still overlaps is resolved by the server's latest-wins
  supersession (the superseded request's `RequestCancelled` is dropped silently, never shown).
- **D-03:** **The `bbjcpl` run is unchanged in this phase.** With the endpoint live, both sources
  produce diagnostics and may overlap on a line until Phase 103 reconciles them; that overlap is
  accepted. Criterion 2 requires the compile path byte-for-byte as in 0.16.x, and Phase 103 owns
  de-duplication. — **Reversibility:** reversible — Phase 103 changes exactly this.
- **D-04:** **A document is parsed on open as well as on edit**: the first build after `didOpen`
  sends a parse, so a file with errors shows them immediately, under the same gate as `bbjcpl`
  today (`shouldCompileWithBbjcpl`: open in an editor, `file:` scheme, not the synthetic
  classpath document, not an external PREFIX-resolved document).

### Mode detection & visibility
- **D-05:** **The first real parse on a connection is the probe.** No empty-text probe, no
  capability request: the first document parse is sent as a normal `parseProgram`; a
  `MethodNotFound` (-32601) latches "off", a result (or any application error -33001..-33005,
  which proves the method exists) latches "on". Same pattern as `ensureCompleteClassIndex`'s
  `getAllClassNames` latch in `java-interop.ts`. — **Reversibility:** reversible.
- **D-06:** **The latch is per socket connection.** It is reset whenever a new connection is
  established — after a reconnect following an outage, and after a cache clear (the
  refresh-Java-classes command, `clearCache()`), so a BBjServices swapped underneath mid-session
  is picked up in either direction. Literally "once per connection".
- **D-07:** **Server log only.** One info line per connection stating the mode — of the form
  "Live compiler diagnostics: on" / "Live compiler diagnostics: off (endpoint not available)" —
  through the existing `logger`; no notification, no status-bar item, no popup, no client change
  in either IDE. — **Reversibility:** reversible — a status surface can be added later as its
  own capability.
- **D-08:** **Failure log cadence: first failure per connection per failure kind at warn,
  repeats at debug until recovery.** A later success clears the latch so the next outage warns
  again. Failure kinds are the JSON-RPC application codes (-33001 parser exception, -33002
  timeout, -33003 size cap, -33004 service unavailable, -33005 protected), transport failures
  (breaker open, failed connect, connection closed) and a malformed result. A failure never
  produces a diagnostic and never changes the on/off latch (D-05); connection failures go
  through the existing circuit breaker, which already owns the one-popup-per-outage behaviour
  of 0.16.x — the live parse adds no second dialog.

### Diagnostic appearance
- **D-09:** **A new, distinct diagnostic `source` (proposal: `BBj Parser`), no tier change.**
  The live errors do not reuse `BBjCPL`, so `bbj-document-validator.ts`'s Rule 0 (BBjCPL errors
  suppress Langium parse errors) does not fire on them; `applyDiagnosticHierarchy` treats them as
  ordinary Error-severity diagnostics. Phase 103 decides how they interact with Langium and
  `bbjcpl` diagnostics with the probe result in hand. — **Reversibility:** costly — Phase 103's
  matching and the conformance harness's endpoint mode (Phase 104) will key on this source
  string; renaming it later touches both.
- **D-10:** **Severity is Error** for every live parser diagnostic (v4.5 scoping decision: new
  compiler diagnostics are errors, like the compiler's own). **The message is BBj's own text,
  unchanged; the categories go into the diagnostic's `code` field** (joined when an error carries
  several), which VS Code shows after the message and IntelliJ in the tooltip, and which Phase
  103 can match on.
- **D-11:** **A position that does not fit the document is clamped, never dropped**: line to the
  last line, character to the line's end; a range that collapses spans the whole line. The
  conversion from BBj's one-based editor lines and characters to zero-based LSP ranges is the
  client's job (MR contract), tested with the PSRV-05 fixtures (D-15).
- **D-12:** **`bbj.diagnostics.maxErrors` (default 20) caps the live parser's errors too**, in
  the parser's own order, per document — one setting governs both kinds of syntax error.

### Docs & verification
- **D-13:** **Documentation: a prerequisites line plus a features paragraph, in both guides.**
  `documentation/docs/vscode/getting-started.md` and `documentation/docs/intellij/getting-started.md`
  keep "BBj 25.00 or higher" as the base prerequisite and add that live compiler diagnostics
  need BBj 26.03 or later; the "Requirements" sections of both `index.md` files get the same
  one-liner; both `features.md` files get a short "Live compiler diagnostics" entry saying what
  it does, that it follows `bbj.compiler.trigger`, and that an older BBj simply keeps the
  save-time compiler check. No new configuration page section.
- **D-14:** **The service double is `JavaInteropTestService` in `bbj-vscode/test/bbj-test-module.ts`,
  made scriptable for `parseProgram`**: by default it answers like an old server
  (`MethodNotFound`), and tests can script a result list or a `-3300x` application error, in the
  same hermetic, no-socket pattern the `getAllClassNames` double uses. The PSRV-04 test runs
  the whole open-edit-validate path against the default (old-server) double and asserts: no
  live diagnostic, `bbjcpl` path still invoked, one "off" log line, no error.
- **D-15:** **Coordinate tests are hand-written DTO fixtures plus one gated live check.** Unit
  tests feed hand-written `ParseError` DTOs (positions per the MR's convention) through the
  converter for each PSRV-05 case — colon continuation, user line numbers, CRLF, no final
  newline, plus D-11's out-of-range cases; one `RUN_BBJ_TESTS`-gated test sends the same four
  invented documents to the live endpoint and asserts the editor ranges, so the convention is
  confirmed against the real parser once. Fixture programs are invented, minimal BBj.
- **D-16:** **Hand UAT and the live test run against the `bbj-ls` jar already deployed in
  `/opt/bbx/.lib/bbjls/` as it is.** The five critical `101-REVIEW.md` findings (null
  `canonicalName`, unreachable -33004, close-vs-submit race, stuck overrunning marker,
  accept-loop close) are fixed separately in `bbj-ls` before its merge request is merged; this
  phase's client codes to the MR contract and must not depend on those fixes (in particular it
  always sends a non-null `canonicalName`). The phase stays in one repository.

### Claude's Discretion
- File and class names: proposal `bbj-parser-service.ts` / `BBjParserService` beside
  `bbj-cpl-service.ts`, registered in `bbj-module.ts` (the `compiler` service group next to
  `BBjCPLService` is the obvious home); whether the request/latch lives on `JavaInteropService`
  (which owns the socket, the breaker and the per-connection reset points) or in the new service
  calling through it — the researcher decides after reading `connect()`/`clearCache()`.
- Request payload: `text` = the document's current text; `canonicalName` = `document.uri.fsPath`;
  `version` = the document's LSP version as a string; `prefixes` = the workspace manager's
  resolved PREFIX list; `workspaceRoots` = the workspace folder paths. Prefixes and roots are
  sent because the contract carries them, with no client expectation built on reference
  resolution.
- Converter internals (one-based to zero-based, CRLF handling, the whole-line fallback trim),
  how the latest document text is captured at debounce time, and whether the client cancels an
  in-flight request on a newer edit or simply drops a `RequestCancelled` result.
- Exact wording of the mode and failure log lines, the joined-category separator in `code`, and
  the exact source label text.
- Plan split and order. Obvious default: (1) the client and probe latch with the old-server
  double and the PSRV-04 fallback test; (2) the document-builder hook, coordinate converter,
  clamping, cap, and PSRV-05 fixtures; (3) the gated live test, docs, hand UAT in both IDEs
  (with the endpoint present, and with the pre-endpoint 26.02 jar swapped in for the
  "behaves like 0.16.x" check), branch and PR.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — "Phase 102" block (goal, five success criteria, ordering note) and
  the "Which repository each phase changes" paragraph; the Phase 103 block for what this phase
  must leave to it
- `.planning/REQUIREMENTS.md` — PSRV-03, PSRV-04, PSRV-05, PSRV-08, PSRV-09 (owned here);
  PSRV-06/07 as the consumer this phase's source tag and code field must serve
- `.planning/STATE.md` — "Active Constraints" (v4.5 entries: probe not version string, no
  proprietary text, host-neutral LS requests, branch + PR with register check) and the
  Phase 101 decision and blocker entries
- `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONTEXT.md` — the
  user's standing preference for lean phases (its `<specifics>`)

### The endpoint contract (read this, not the Java)
- `.planning/phases/101-bbj-parser-endpoint-in-bbj-ls/101-MR-DESCRIPTION.md` — **the wire
  contract**: `parseProgram`, `ParseProgramParams` / `ParseProgramResult` / `ParseError` fields,
  the one-based coordinate convention and whole-line fallback, `RequestCancelled` for superseded
  requests, error codes -33001..-33005 and their meanings, guards (10 s timeout, 4 MiB cap),
  the observed reference-resolution limitation, the shared-cache note, and the older-server
  probe replay (-32601 in 0.244 s, one WARNING line, no stack trace)
- `.planning/phases/101-bbj-parser-endpoint-in-bbj-ls/101-CONTEXT.md` — D-01..D-14 (why the
  contract looks the way it does; D-11 latest-wins and D-12 failures-as-JSON-RPC-errors are the
  guarantees this client leans on)
- `.planning/phases/101-bbj-parser-endpoint-in-bbj-ls/101-VERIFICATION.md` — the accepted
  override: no `USE`/`CALL` reference diagnostics may be expected from the endpoint
- `.planning/phases/101-bbj-parser-endpoint-in-bbj-ls/101-REVIEW.md` — the five critical
  findings the deployed jar still carries (D-16: code defensively, do not depend on the fixes)

### The code this phase changes
- `bbj-vscode/src/language/java-interop.ts` — `connect()` and the circuit breaker (the only
  socket path; one popup per outage already lives here), `ensureCompleteClassIndex()` and
  `METHOD_NOT_FOUND` (the once-per-connection latch pattern D-05 copies), `clearCache()` (the
  reset point D-06 hooks), `sendRequestSafe`, `isInteropTransportFailure`
- `bbj-vscode/src/language/bbj-document-builder.ts` — `buildDocuments()` → `runBbjcplForDocuments()`
  (trigger gate, `off` clearing), `shouldCompileWithBbjcpl()` (D-04's gate), `debouncedCompile()`
  and `SAVE_DEBOUNCE_MS` (D-02's timer), `trackBbjcplAvailability()`, `hasPendingWork()` (the
  config-reload quiescence predicate must also cover a pending live parse)
- `bbj-vscode/src/language/bbj-document-validator.ts` — `getCompilerTrigger()`/`setCompilerTrigger()`,
  `DiagnosticTier`, `applyDiagnosticHierarchy()` (Rule 0 keys on `source === 'BBjCPL'`, which
  D-09 deliberately avoids), `mergeDiagnostics()`, `setMaxErrors()` (D-12)
- `bbj-vscode/src/language/bbj-cpl-service.ts` — the sibling service (structure, `logger`
  usage, timeout handling) and the `bbjcpl` path that must stay unchanged
- `bbj-vscode/src/language/bbj-module.ts` — `compiler` service group registration
- `bbj-vscode/src/language/bbj-ws-manager.ts` — `compilerTrigger` from initialization options,
  `settings.prefixes` (PREFIX list), `isExternalDocument()`
- `bbj-vscode/src/language/main.ts` — the `didChangeConfiguration` path that applies
  `compiler.trigger` and `diagnostics.maxErrors` at runtime
- `bbj-vscode/src/language/bbj-lexer.ts` — `prepareLineSplitter()`: how the language server
  itself joins colon continuation lines (context for the PSRV-05 fixtures; the live parser's
  editor lines are BBj's, not this splitter's)
- `bbj-vscode/src/language/bbj-notifications.ts` — the isolation module for client
  notifications (not used by this phase; do not import `main.ts` from services)
- `bbj-vscode/test/bbj-test-module.ts` — `JavaInteropTestService` (D-14's double), the
  hermetic no-socket rule and the `seedCompleteClassIndex` / `resetCompleteClassIndex` seams
- `bbj-vscode/test/test-helper.ts` — `shouldRunBBjTests()` / `RUN_BBJ_TESTS` gate for D-15's
  live test
- `bbj-vscode/package.json` — `bbj.compiler.trigger` (its description says 2 s; the code says
  500 ms) and `bbj.diagnostics.maxErrors`

### Documentation to change
- `documentation/docs/vscode/getting-started.md` §Prerequisites, `documentation/docs/vscode/index.md`
  §Requirements, `documentation/docs/vscode/features.md`
- `documentation/docs/intellij/getting-started.md` §Prerequisites, `documentation/docs/intellij/index.md`
  §Requirements, `documentation/docs/intellij/features.md`

### Local environment
- `/opt/bbx` — BBj 26.02 with the Phase 101 `bbj-ls` jar deployed in `/opt/bbx/.lib/bbjls/`
  (BBjServices on `127.0.0.1:5008`); the original pre-endpoint jar is backed up outside that
  folder for the "older server" hand replay (see `101-CONTEXT.md` D-17 and
  `memory/devcontainer-bbj-setup.md` for the stop/start loop)
- `CLAUDE.md` — "Shell and File-Access Rules" (absolute paths, no `cd` chains, scoped
  searches) and the vitest cwd rule (run from `bbj-vscode/`)

No external specs or ADRs beyond the Phase 101 MR text — it is the contract.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `JavaInteropService.connect()` + circuit breaker — the one socket path; the live parse rides
  the same `MessageConnection`, so outages, backoff and the single popup per outage are
  inherited, not re-implemented.
- `ensureCompleteClassIndex()` / `METHOD_NOT_FOUND` — the exact once-per-connection latch
  shape D-05 needs; `clearCompleteClassIndex()` from `clearCache()` is the reset shape D-06
  needs.
- `bbj-document-builder.ts`'s `debouncedCompile()` / `cplDebounceTimers` /
  `shouldCompileWithBbjcpl()` — the scheduling, gating and clear-then-show pattern for a second
  compiler source; `notifyDocumentPhase(document, Validated, CancellationToken.None)` re-publishes
  merged diagnostics.
- `bbj-document-validator.ts` — `setMaxErrors`/`applyDiagnosticHierarchy` for D-12; the tier
  enum shows why a new source string stays out of Rule 0 (D-09).
- `JavaInteropTestService` — already an old server without `getAllClassNames`; extending it for
  `parseProgram` is a few overrides.
- `RequestType` declarations at the bottom of `java-interop.ts` (`getAllClassNamesRequest`) —
  the pattern for `parseProgramRequest` with typed params/result.

### Established Patterns
- Older-server detection is by `MethodNotFound`, latched once per connection, reset on cache
  clear; nothing compares versions.
- `bbjcpl` diagnostics are cleared then re-merged per debounce; failures return empty
  diagnostics plus a log line, never a diagnostic.
- Logging goes through `logger` (`logger.ts`, console-backed, level from `bbj.debug`); no
  `main.ts` import from services (`bbj-notifications.ts` isolation).
- Tests: Vitest from `bbj-vscode/`, `EmptyFileSystem`, `createBBjTestServices`; every
  `.bbj` under `test/test-data/` must parse cleanly (`example-files.test.ts`) — invented
  fixture programs with deliberate syntax errors must therefore live in the test file or
  a non-`test-data` folder.
- Both IDEs pass settings as flat `initializationOptions`; VS Code additionally pushes
  `didChangeConfiguration`. Nothing new is needed since D-01 adds no setting.

### Integration Points
- `buildDocuments()` → `runBbjcplForDocuments()` in `bbj-document-builder.ts` is where the live
  parse is scheduled beside the `bbjcpl` run (same trigger gate, same debounce, same document
  gate).
- `document.diagnostics` merge and re-notify: live errors are appended with their own source,
  cleared before each new parse of the same document, and cleared when the trigger is `off`.
- `JavaInteropService`'s connection lifecycle (connect / onClose / clearCache) is where the
  per-connection latch and the mode log line attach.
- `hasPendingWork()` should include a pending live parse so the config-reload restart never
  fires mid-parse.

</code_context>

<specifics>
## Specific Ideas

- The user chose the recommended, minimal option on every question: no new setting, no new
  IDE surface, no `bbj-ls` work, one repository — the same lean posture as Phases 98-101.
- "Behaves exactly like 0.16.x" is to be shown, not argued: the PSRV-04 automated test against
  the old-server double is the regression gate, and hand UAT swaps the backed-up pre-endpoint
  jar back in once to watch both IDEs against a real older server.
- The Phase 101 probe replay measured -32601 in 0.244 s with exactly one WARNING line on the
  server side; the client side must be equally quiet: one "off" info line, nothing at warn.
- Overlapping live and `bbjcpl` errors on one line are expected and accepted in this phase's
  UAT; the tester should not file them as defects — Phase 103 removes them.
- The PSRV-05 fixture documents are invented BBj (a colon-continued `PRINT`, a line-numbered
  program, a CRLF file, a file whose last line has no newline), each with one deliberate
  syntax error on a known line; no corpus or proprietary text.

</specifics>

<deferred>
## Deferred Ideas

- A status-bar indicator or notification for live-diagnostics mode (`bbj/liveDiagnostics`) —
  would need `extension.ts` and an IntelliJ client handler; its own capability later.
- A dedicated `bbj.compiler.liveDiagnostics` toggle independent of `bbj.compiler.trigger`.
- Making `on-save` actually differ from `debounced` in the server (today both compile 500 ms
  after any build; the setting description promises 2 s) — a pre-existing gap, not this phase.
- Skipping the `bbjcpl` run while the endpoint is live — Phase 103's reconciliation decides.
- The five critical `101-REVIEW.md` findings in `bbj-ls` — a `bbj-ls` follow-up before its MR
  merges, not part of this phase.
- A configuration-page section documenting the log lines and troubleshooting steps.

### Reviewed Todos (not folded)
- "linking.test.ts Interop related tests fail even after a targeted class warm-up" — test
  harness; the `RUN_BBJ_TESTS` gate is used as-is by D-15's live test, the todo stays pending.
- "Loosen single-line IF balance rule for the 5 re-flagged valid files" — validator residue,
  unrelated to the endpoint client.
- "A lost language-server connection is invisible to the plugin's crash detection" and "The
  server status log line prints a stale previous status" — IntelliJ server lifecycle, LSP4IJ
  #1672/#1673; no `bbj-intellij/` change in this phase.
- "Phase 97 code-review follow-ups" — IntelliJ Node download.

</deferred>

---

*Phase: 102-Live Compiler Diagnostics With Backward Compatibility*
*Context gathered: 2026-09-22*
