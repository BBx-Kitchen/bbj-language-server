---
phase: 101-bbj-parser-endpoint-in-bbj-ls
plan: 03
subsystem: api
tags: [lsp4j, json-rpc, bbj-ls, parser-service-api, concurrency]

# Dependency graph
requires:
  - phase: 101-02
    provides: "the real parse (BbjPrefixAlgorithm, ParserWorker running BBj's parser with type checking off), the endpoint proven against a live BBjServices"
provides:
  - "ParserWorker.submit: per-connection single-thread daemon executor with a latest-wins ConcurrentHashMap queue keyed by canonical name; a superseded request always receives lsp4j's RequestCancelled, never an errors list"
  - "Five fixed JSON-RPC application error codes (-33001..-33005) covering every parse failure mode, translated from any escaping Throwable, never surfaced as an errors-list entry"
  - "Two -Dbbj.interop.parse.* system properties (timeoutMs default 10000, maxBytes default 4194304) bounding per-parse time and document size, with a package-private size-cap check InteropService.parseProgram runs before the worker is touched"
  - "Connection-close teardown: LanguageService captures launcher.startListening()'s future and shuts the connection's ParserWorker down on completion; InteropService.shutdownParserWorker() is idempotent; a failed parse logs exactly once at WARNING naming the peer, the code and the message"
affects: [101-04, 102]

# Actuals (#2632)
actuals:
  tokens: 7612
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-connection single-thread daemon ExecutorService plus a ConcurrentHashMap<String, PendingParse> latest-wins queue keyed by canonical name"
    - "CompletableFuture.completeOnTimeout as a lightweight, no-extra-thread-pool overrun marker; the running task clears it itself in a finally block"
    - "static final int application error codes with a cap-explicit test overload, so JUnit exercises the size guard without depending on JVM class-init ordering for the system-property default"

key-files:
  created:
    - /home/coder/repos/bbj-ls/src/test/java/bbj/interop/ParseGuardsTest.java
  modified:
    - /home/coder/repos/bbj-ls/src/main/java/bbj/interop/ParserWorker.java
    - /home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java
    - /home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java

key-decisions:
  - "A non-positive -Dbbj.interop.parse.* override falls back to the documented default rather than disabling the guard (readLongProperty helper) — simpler than a separate 'unset' sentinel and still satisfies 'clamp to a sane positive minimum'"
  - "checkSize(params) delegates to a cap-explicit checkSize(params, maxBytes) overload so ParseGuardsTest can exercise the guard without racing ParserWorker's static-field class-initialization order in the shared Surefire JVM"
  - "The protected-program failure signal is a generic, non-proprietary text heuristic (class name or message containing 'protect' or 'password') rather than a specific BBj exception type, since no reliable protected-program exception type was identified and D-19 forbids depending on internal BBj source"
  - "InteropService.logVerbose's visibility widened from private to package-private so ParserWorker can log the two system properties' effective values through the same existing helper, per the plan's own instruction, instead of duplicating a second verbose-flag mechanism"

requirements-completed: [PSRV-01, PSRV-02]

coverage:
  - id: D1
    description: "One daemon worker thread per connection serializes that connection's parses; a newer request for the same canonical name supersedes an older one (queued or in-flight) with lsp4j's RequestCancelled, never an errors list, under both interleavings"
    requirement: PSRV-02
    verification:
      - kind: unit
        ref: "task 1 acceptance criteria (grep-based structural checks: newSingleThreadExecutor count 1, no synchronized on parse, ConcurrentHashMap keyed on canonicalName, setDaemon(true), no forbidden thread-pool constructs)"
        status: pass
      - kind: integration
        ref: "bbj-ls: mvn test -Dbbj.interop.it.requireServer=true -> Tests run: 15, Failures: 0, Errors: 0, Skipped: 0 (exercises submit() on every live-socket scenario)"
        status: pass
    human_judgment: true
    rationale: "The latest-wins supersession path itself (a second request racing a first, in-flight one) is implemented and structurally verified but not exercised by a dedicated concurrency test in this plan — no test issues two overlapping parseProgram calls for the same canonical name and asserts RequestCancelled on the superseded one. The design and its two interleavings are verified by code review against D-11's own two cases, not by a live race test."
  - id: D2
    description: "Every parse failure mode (parser exception, protected program, missing BBj class, timeout, over-size document) produces one of five distinct application error codes as a JSON-RPC ResponseError, never an entry in the result's own error list"
    requirement: PSRV-02
    verification:
      - kind: unit
        ref: "bbj-ls:src/test/java/bbj/interop/ParseGuardsTest#textOneByteOverTheCapThrowsWithTheSizeCode"
        status: pass
      - kind: unit
        ref: "bbj-ls:src/test/java/bbj/interop/ParseGuardsTest#overLongPrefixListThrowsWithTheSameSizeCode"
        status: pass
      - kind: unit
        ref: "bbj-ls:src/test/java/bbj/interop/ParseGuardsTest#theFiveApplicationCodesArePairwiseDistinctAndOutsideBothReservedBands"
        status: pass
    human_judgment: true
    rationale: "The size-cap and code-shape paths are directly tested. The timeout code (-33002, the overrunning-marker fast-fail in submit()), the service-unavailable code (-33004) and the protected-program code (-33005) are implemented and structurally reviewed but have no dedicated test triggering an actual timeout, a missing ParserServiceIF, or a genuinely protected program against the live server — those conditions are difficult to reproduce safely in this dev-container within this plan's scope."
  - id: D3
    description: "A closed connection tears down its parser worker thread and drops its reference to the factory and prefix algorithm; a failed parse logs exactly once at WARNING naming the peer, the code and the message, with no stack trace and no duplicate verbose-flag output"
    requirement: PSRV-02
    verification:
      - kind: integration
        ref: "bbj-ls: mvn test -Dbbj.interop.it.requireServer=true (ParseProgramIntegrationTest's @AfterAll socket.close() triggers LanguageService's awaitDisconnect -> InteropService.shutdownParserWorker() server-side on every run) -> Tests run: 15, Failures: 0, Errors: 0, Skipped: 0"
        status: pass
      - kind: unit
        ref: "task 3 acceptance criteria (grep-based: awaitTermination + shutdownNow present, Level.WARNING present, no printStackTrace / Level.INFO-with-Throwable anywhere in ParserWorker.java)"
        status: pass
    human_judgment: true
    rationale: "The teardown path fires on every test run (proven live: the whole suite stays green across the connection close), but no test asserts the WARNING log line's exact content, nor that the worker thread and factory are actually collected afterward (no thread-dump or heap assertion) — that is a structural/code-review guarantee, not a directly asserted one in this plan's test suite."
  - id: D4
    description: "The whole bbj-ls suite is green with 0 skipped against the redeployed jar, and bbj-language-server shows changes under .planning/ only"
    verification:
      - kind: other
        ref: "bbj-ls: mvn test -Dbbj.interop.it.requireServer=true -> Tests run: 15, Failures: 0, Errors: 0, Skipped: 0; ls -1 /opt/bbx/.lib/bbjls/ == bbj-ls.jar, org.eclipse.lsp4j.jsonrpc-0.20.1.jar"
        status: pass
      - kind: other
        ref: "git -C bbj-language-server status --porcelain shows only .planning/STATE.md and .planning/milestone.lock, both pre-existing before this plan started"
        status: pass
    human_judgment: false

# Metrics
duration: ~14min
completed: 2026-09-22
status: complete
---

# Phase 101 Plan 03: BBj Parser Endpoint — Concurrency, Guards & Error Codes Summary

**`ParserWorker` grows a per-connection single-thread daemon executor with a latest-wins request queue, five fixed JSON-RPC application error codes, two `-Dbbj.interop.parse.*` system-property guards, and connection-close teardown — redeployed and proven against a live BBjServices with all 15 bbj-ls tests green.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-09-22T08:19:00Z
- **Completed:** 2026-09-22T08:32:18Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified), all in `/home/coder/repos/bbj-ls`

## Two-Repository Record

This phase changes zero files in `bbj-language-server` — only `.planning/`. The code lives in
`/home/coder/repos/bbj-ls`, a separate repository this plan does not push.

**bbj-ls branch:** `feat/689-parse-program-endpoint` (continued from plans 01-02, cut from `develop` at `d64b164`)

**Commits on the branch made by this plan** (newest last):

| Commit | Subject |
|--------|---------|
| `0613f11` | `feat(#689): serialize parses onto one worker thread per connection, latest-wins` |
| `92fc543` | `feat(#689): add size cap, timeout wiring and five application error codes` |
| `239aa24` | `feat(#689): tear the parser worker down on connection close, log failures once` |

Full branch history (plans 01-03, `develop..HEAD`):

```
b518069 feat(#689): add parseProgram endpoint wiring and live-socket test
1040ed5 test(#689): pin older-server MethodNotFound behavior in-process
d568968 docs(#689): document offline install of the com.basis jars
b8809d4 feat(#689): resolve the active document in memory and referenced programs from disk
b64a9a8 feat(#689): run BBj's parser and map its JSON errors onto the DTO
aa19893 test(#689): deploy the real parse and grow the live-socket suite to 8 scenarios
0613f11 feat(#689): serialize parses onto one worker thread per connection, latest-wins
92fc543 feat(#689): add size cap, timeout wiring and five application error codes
239aa24 feat(#689): tear the parser worker down on connection close, log failures once
```

**Deployed jar (`/opt/bbx/.lib/bbjls/bbj-ls.jar`):** 36,620 bytes, SHA-256
`fcba25753c2f36c8b50e49397b049bc9bc681fd352b5bddb2a95a4f27b8851ee`, deployed 2026-09-22 08:31 UTC.
`/opt/bbx/.lib/bbjls/` holds exactly the two expected files afterward (`bbj-ls.jar`,
`org.eclipse.lsp4j.jsonrpc-0.20.1.jar`). BBjServices stopped and restarted cleanly on this cycle —
no lingering-process workaround was needed this time.

**Final `mvn test -Dbbj.interop.it.requireServer=true` run** (all three test classes, live
BBjServices required): `Tests run: 15, Failures: 0, Errors: 0, Skipped: 0` —
`MethodNotFoundProbeTest` (2) + `ParseGuardsTest` (5) + `ParseProgramIntegrationTest` (8).

**Register-check outcome (per-task, and over the full `develop..HEAD` branch diff):** CLEAN — no
`PSRV-0`, `D-NN`, `101-NN` or `CR-N` token found in any added line of `src`, `pom.xml` or
`README.md`. One self-caught slip during task 1 (a stray `D-11` reference in a Javadoc comment)
and one during task 2 (the reserved-band Javadoc's own prose numbers `-32000`/`-32899`/`-32800`
tripping the band-literal verify grep) were both found and fixed by the plan's own verify loop
before either landed in a commit — see Deviations.

## Error-Code Table (final)

| Code | Constant | Condition |
|------|----------|-----------|
| `-33001` | `ERROR_PARSE_FAILED` | The parser threw while loading or serialising the program |
| `-33002` | `ERROR_TIMEOUT` | The parse exceeded the configured timeout, or arrived while a previous parse on this connection was still overrunning |
| `-33003` | `ERROR_TOO_LARGE` | The request exceeded the configured size cap (document bytes, or combined `prefixes`/`workspaceRoots` entry count) |
| `-33004` | `ERROR_SERVICE_UNAVAILABLE` | The parser service could not be obtained, or a BBj class was missing at runtime |
| `-33005` | `ERROR_PROTECTED_PROGRAM` | The program is protected and no password is carried by this endpoint |
| — | `ResponseErrorCode.RequestCancelled` (lsp4j's own) | A newer request for the same canonical name superseded this one |

All five codes sit below both JSON-RPC's own reserved error-code range and lsp4j's separately
reserved LSP error-code range, confirmed by `ParseGuardsTest`'s own assertion that every code is
strictly less than `-32900`.

## System Properties (final)

| Property | Default | Non-positive override behavior |
|----------|---------|--------------------------------|
| `bbj.interop.parse.timeoutMs` | `10000` (10 s) | Falls back to the default rather than disabling the guard |
| `bbj.interop.parse.maxBytes` | `4194304` (4 MiB) | Falls back to the default rather than disabling the guard |

Effective values are logged once through the existing `InteropService.logVerbose` helper
(widened from `private` to package-visible), matching the existing `-Dbbj.interop.verbose`
convention.

## Accomplishments

- `ParserWorker` gained a per-connection, named daemon `Executors.newSingleThreadExecutor`
  serializing every parse on that connection — the previously `synchronized` `parse` method is now
  a plain private instance method, since the single thread is what now makes access to the
  non-thread-safe factory safe.
- A new public `submit(ParseProgramParams)` replaces the old synchronous stub: a
  `ConcurrentHashMap<String, PendingParse>` keyed on canonical name implements latest-wins — a
  displaced queued request is cancelled immediately, a displaced in-flight request finishes but
  discovers on completion it is no longer current and is completed with `RequestCancelled` instead,
  its computed result dropped. `InteropService.parseProgram` now delegates to `submit` directly.
- An "overrunning" marker (set by a `CompletableFuture.completeOnTimeout` side-timer, cleared by the
  running task itself) makes `submit` fail new callers fast with the timeout code during an
  abandoned parse, without shutting the executor down or building a second worker/factory — nothing
  in BBj's parse path can be interrupted, so the abandoned parse keeps running regardless.
- Five `static final int` application error codes (`-33001`..`-33005`) and two
  `-Dbbj.interop.parse.*` system properties (`timeoutMs`, `maxBytes`) were added, both clamped to
  their documented default on a non-positive override.
- `ParserWorker.checkSize` (plus a cap-explicit overload for testing) rejects an over-size document
  or an over-long combined `prefixes`/`workspaceRoots` list before the worker is touched, callable
  without loading any BBj class. `InteropService.parseProgram` calls it on the dispatch thread and
  returns a failed future when it trips.
- `runPending` now translates every escaping `Throwable` into one of the five codes: a generic
  protected/password text heuristic, a missing-class/service-unavailable check, and a
  parse-failed fallback when neither signal is present.
- `ParseGuardsTest` (5 plain-JUnit tests, no BBjServices) covers the size cap, the entry-count cap,
  null text/lists, and the five codes' own pairwise-distinct, below-`-32900` shape.
- `LanguageService`'s accept loop now captures `launcher.startListening()`'s `Future<Void>` instead
  of discarding it; a task on the shared `EXECUTOR` waits on it, then calls the connection's new
  `InteropService.shutdownParserWorker()` and closes the channel, logging the disconnect once at
  INFO.
- `InteropService` gained a `SocketAddress`-taking constructor overload (the no-arg constructor
  delegates with a null/`<unknown peer>` placeholder) and the idempotent `shutdownParserWorker()`.
- `ParserWorker.shutdown()` stops the executor (`shutdown`/`awaitTermination`/`shutdownNow`),
  completes every still-pending caller with the cancellation code, and drops its own reference to
  the factory and prefix algorithm so both become collectable.
- A failed parse now logs exactly once, through `java.util.logging` at `WARNING`, naming the
  connection's peer, the application code and the error message — never the document text, never a
  stack trace, and not duplicated through the verbose flag.
- The endpoint was redeployed end to end (offline build, stop/swap/start, poll `:5008`) and the
  whole bbj-ls suite ran green against the live server: 15/15, 0 failures/errors/skipped.

## Task Commits

1. **Task 1: One worker thread per connection, latest request wins** - `0613f11` (feat)
2. **Task 2: Size cap, timeout and the five application error codes** - `92fc543` (feat)
3. **Task 3: Tear the worker down when the connection closes, and log a failure once** - `239aa24` (feat)

**Plan metadata:** committed in `bbj-language-server` alongside this SUMMARY (see
`git_commit_metadata` below).

## Files Created/Modified

- `bbj-ls/src/main/java/bbj/interop/ParserWorker.java` — latest-wins queue, overrunning marker,
  five error codes, two system properties, size-cap check, failure translation and logging,
  connection-close `shutdown()`
- `bbj-ls/src/main/java/bbj/interop/InteropService.java` — `parseProgram` delegates to
  `submit`/`checkSize`; `SocketAddress`-taking constructor overload; `shutdownParserWorker()`;
  `logVerbose` widened to package-visible
- `bbj-ls/src/main/java/bbj/interop/LanguageService.java` — captures and awaits
  `launcher.startListening()`'s future, tears the connection's worker down on close
- `bbj-ls/src/test/java/bbj/interop/ParseGuardsTest.java` — five plain-JUnit checks for the size
  cap, entry-count cap, null handling, and the five codes' own shape

## Decisions Made

- Non-positive `-Dbbj.interop.parse.*` overrides fall back to the documented default rather than
  disabling the guard.
- `checkSize` gained a cap-explicit two-argument overload purely for test isolation from JVM
  class-initialization ordering; the single-argument `checkSize(params)` used by `InteropService`
  is unaffected.
- The protected-program signal is a generic text heuristic (`"protect"`/`"password"` in the class
  name or message), not a specific BBj exception type, since none was identified and D-19 forbids
  depending on internal BBj source for that identification.
- `InteropService.logVerbose`'s visibility widened from `private` to package-visible so
  `ParserWorker` can reuse it for the two system properties' startup log line, per the plan's own
  instruction.

## Deviations from Plan

None — plan executed exactly as written. Two self-caught authoring slips (a stray `D-11` reference
in a Javadoc comment during task 1, and the reserved-band Javadoc's own prose numbers tripping its
sibling verify grep during task 2) were found and corrected by the plan's own verify loop before
either was staged or committed — neither ever landed in the branch history, so neither is a
deviation from what was committed.

## Issues Encountered

None. The BBjServices lingering-process workaround plans 01-02 needed was not required this time —
`stopbbjservices` released port 5008 and the process exited cleanly within 2 seconds.

## User Setup Required

None — no external service configuration required. (Plan 04 will need BASIS GitLab SSH access to
push the branch and open the merge request; not part of this plan.)

## Next Phase Readiness

- `ParserWorker`'s concurrency, guard and teardown design (D-11, D-12, D-13, D-14) is complete,
  committed, and proven against a live BBjServices with all 15 bbj-ls tests green.
- Plan 04 (grow the live-socket suite to cover supersession and the size-cap error code end to end,
  replay the older-server probe against the actual 26.02 jar, confirm the pre-existing requests
  survive the swap, write `101-MR-DESCRIPTION.md`, push the branch and open the BASIS GitLab merge
  request) can proceed unblocked.
- Open items surfaced for plan 04 or later, not blocking: the latest-wins live-race interleaving,
  the timeout/service-unavailable/protected-program codes, and the WARNING log line's exact content
  are all implemented and structurally verified in this plan but not exercised by a dedicated live
  test (see the `coverage` block's `human_judgment: true` rationales above) — plan 04's own D-15
  scenarios (supersession, size-cap error code) close part of this gap; the rest is reasonable to
  leave as structural/code-review coverage for a first cut of an internal, developer-tooling
  endpoint.
- `WINDOWS.md` entry 4 (plan 02's finding that `BbjPrefixAlgorithm.findProgram` is never invoked
  under `setTypeChecking(false)`) is unaffected by this plan and remains open for Phase 102/103.
- The branch `feat/689-parse-program-endpoint` and issue #689 continue to be the landing point for
  plan 04; nothing has been pushed and nothing lands on `develop` until plan 04's MR.
- No blockers for plan 04.

## Self-Check: PASSED

- `[ -f /home/coder/repos/bbj-ls/src/test/java/bbj/interop/ParseGuardsTest.java ]` → FOUND
- `git -C /home/coder/repos/bbj-ls log --oneline develop..HEAD` → 9 commits found (plans 01-02's 6 +
  this plan's `0613f11`, `92fc543`, `239aa24`)
- Re-ran all task-level `<acceptance_criteria>` and the plan-level `<verification>` block — all
  pass (see tables above); `mvn test -Dbbj.interop.it.requireServer=true` (whole module) →
  `Tests run: 15, Failures: 0, Errors: 0, Skipped: 0`
- `git -C /home/coder/repos/bbj-ls status --porcelain` → empty
- `git -C /home/coder/repos/bbj-language-server status --porcelain` → changes under `.planning/`
  only (`.planning/STATE.md`, pre-existing modification; `.planning/milestone.lock`, pre-existing
  untracked) — verified before writing this SUMMARY; re-verified after this file is committed

---
*Phase: 101-bbj-parser-endpoint-in-bbj-ls*
*Completed: 2026-09-22*
