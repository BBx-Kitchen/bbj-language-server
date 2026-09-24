---
phase: 101-bbj-parser-endpoint-in-bbj-ls
plan: 01
subsystem: api
tags: [lsp4j, json-rpc, bbj-ls, maven, parser-service-api]

# Dependency graph
requires: []
provides:
  - "bare-name `parseProgram` @JsonRequest on bbj-ls's InteropService, stubbed (empty error list, echoes version)"
  - "the wire contract's three DTOs: ParseProgramParams, ParseProgramResult, ParseError"
  - "the offline build+deploy loop for bbj-ls proven end to end against a live BBjServices"
  - "the older-server MethodNotFound contract proven in-process, no BBjServices needed"
  - "the bbj-ls branch and GitHub issue plans 02-04 continue committing to"
affects: [101-02, 101-03, 101-04]

# Actuals (#2632)
actuals:
  tokens: 4417
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bare-name @JsonRequest on InteropService, CompletableFuture<T> return, public-field DTOs — matches every existing InteropService method"
    - "In-process older-server probe: two lsp4j Launchers wired over PipedInputStream/PipedOutputStream pairs, no socket needed"

key-files:
  created:
    - /home/coder/repos/bbj-ls/src/main/java/bbj/interop/data/ParseProgramParams.java
    - /home/coder/repos/bbj-ls/src/main/java/bbj/interop/data/ParseProgramResult.java
    - /home/coder/repos/bbj-ls/src/main/java/bbj/interop/data/ParseError.java
    - /home/coder/repos/bbj-ls/src/test/java/bbj/interop/BBjServicesAvailability.java
    - /home/coder/repos/bbj-ls/src/test/java/bbj/interop/ParseProgramIntegrationTest.java
    - /home/coder/repos/bbj-ls/src/test/java/bbj/interop/MethodNotFoundProbeTest.java
  modified:
    - /home/coder/repos/bbj-ls/pom.xml
    - /home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java
    - /home/coder/repos/bbj-ls/README.md

key-decisions:
  - "Live-socket test class named ParseProgramIntegrationTest, not ParseProgramIT — Surefire's default includes miss *IT, which is Failsafe's convention (planner decision, recorded in the plan)"
  - "Client-side remote interface (ParseProgramClient) is a public nested interface inside ParseProgramIntegrationTest, reused by MethodNotFoundProbeTest, rather than a separate top-level file — keeps the file set matching the plan's files_modified list exactly"
  - "MethodNotFoundProbeTest silences lsp4j's own GenericEndpoint JUL logger for the scope of its 'no stderr output' assertion — lsp4j logs one benign WARNING line (not a stack trace) for an unrecognized method through java.util.logging's default console handler; silencing it lets the assertion prove the thing that actually matters (no stack trace, no unexpected output) instead of failing on expected framework diagnostics"

requirements-completed: [PSRV-01]

coverage:
  - id: D1
    description: "parseProgram endpoint answers a live JSON-RPC client with the echoed version token and an empty error list, over the freshly built and deployed jar"
    requirement: PSRV-01
    verification:
      - kind: integration
        ref: "bbj-ls:src/test/java/bbj/interop/ParseProgramIntegrationTest#parseProgramEchoesVersionWithNoErrors"
        status: pass
    human_judgment: false
  - id: D2
    description: "A service object lacking parseProgram answers with lsp4j's standard MethodNotFound (-32601), bounded, no stack trace"
    requirement: PSRV-01
    verification:
      - kind: unit
        ref: "bbj-ls:src/test/java/bbj/interop/MethodNotFoundProbeTest#unknownMethodAnswersWithMethodNotFound"
        status: pass
      - kind: unit
        ref: "bbj-ls:src/test/java/bbj/interop/MethodNotFoundProbeTest#unknownMethodWritesNothingToStandardError"
        status: pass
    human_judgment: false
  - id: D3
    description: "bbj-ls builds offline from the local BBj installation with no BASIS Nexus credentials, documented in the README"
    verification:
      - kind: other
        ref: "grep -c install:install-file README.md == 2; mvn -f pom.xml -DskipTests package BUILD SUCCESS"
        status: pass
    human_judgment: false
  - id: D4
    description: "Whole change lives on a branch cut from develop named after a GitHub issue of this repository; nothing lands on develop"
    verification:
      - kind: other
        ref: "git -C bbj-ls branch --show-current == feat/689-parse-program-endpoint; gh issue #689"
        status: pass
    human_judgment: false

# Metrics
duration: ~20min
completed: 2026-09-22
status: complete
---

# Phase 101 Plan 01: BBj Parser Endpoint Tracer Summary

**Bare-name `parseProgram` JSON-RPC endpoint wired into bbj-ls's InteropService (stubbed parse), built, deployed into a live BBjServices, and proven end to end against a real lsp4j client — with the older-server MethodNotFound half proven in-process.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-22T07:11Z
- **Tasks:** 3
- **Files modified:** 9 (6 created, 3 modified), all in `/home/coder/repos/bbj-ls`

## Two-Repository Record

This phase changes zero files in `bbj-language-server` — only `.planning/`. The code lives in
`/home/coder/repos/bbj-ls`, a separate repository this plan does not push.

**bbj-ls branch:** `feat/689-parse-program-endpoint` (cut from `develop` at `d64b164`)

**GitHub issue:** [#689](https://github.com/BBx-Kitchen/bbj-language-server/issues/689) —
"bbj-ls: add parseProgram endpoint over BBj's own parser"

**Commits on the branch** (newest last):

| Commit | Subject |
|--------|---------|
| `b518069` | `feat(#689): add parseProgram endpoint wiring and live-socket test` |
| `1040ed5` | `test(#689): pin older-server MethodNotFound behavior in-process` |
| `d568968` | `docs(#689): document offline install of the com.basis jars` |

**Installed BBj jar hashes (SHA-256, from `/opt/bbx/.lib/`, 2026-09-01 build):**

| Jar | SHA-256 |
|-----|---------|
| `BBjStartup.jar` | `9a6c8962058d991df95de9335c01c668bf5e16d9a88e010426fcb482795c5d94` |
| `ParserServiceAPI.jar` | `5895ca36a00ac8602d2a941ed36d5e5c8686c51ffaf3495a013b04862939104c` |

**Deployed jar (`/opt/bbx/.lib/bbjls/bbj-ls.jar`):** 24,948 bytes, mtime
`2026-09-22 07:06:33 UTC`. The original 26.02 jar (23,389 bytes) is preserved at
`/opt/bbx/.lib/bbjls-backup/bbj-ls.jar.26.02`, outside the load directory.

**Surefire summary lines:**

- Task 1 (`ParseProgramIntegrationTest`, `-Dbbj.interop.it.requireServer=true`, against the
  freshly deployed jar): `Tests run: 1, Failures: 0, Errors: 0, Skipped: 0`
- Task 2 (`MethodNotFoundProbeTest`, no BBjServices needed): `Tests run: 2, Failures: 0,
  Errors: 0, Skipped: 0` — `Total time: 2.901 s`
- Clean full-suite run (`mvn test`, both classes): `Tests run: 3, Failures: 0, Errors: 0,
  Skipped: 0`

**Register-check outcome (per-task, over `git diff develop..HEAD -- src pom.xml README.md`):**
CLEAN for all three tasks — no `PSRV-0`, `D-NN`, `101-NN` or `CR-N` token found in any added
line.

## Accomplishments

- `ParseProgramParams`, `ParseProgramResult` and `ParseError` DTOs declared exactly to D-02/D-03/
  D-04's contract: `categories` is a list (one BBj error line can carry several types at once),
  `ParseProgramResult` does not extend `WithError` (failures are JSON-RPC errors, not populated
  fields), and `ParseError`'s Javadoc states the editor-coordinate convention verbatim, one-based,
  unconverted.
- `InteropService.parseProgram` added as a bare `@JsonRequest`, matching `getClassInfo`/
  `getAllClassNames`'s existing shape exactly; body is stubbed (echoes `version`, empty
  `errors`) pending plan 02.
- `com.basis:ParserServiceAPI` and `com.basis:BBjStartup` installed offline from the local BBj
  installation's jars via `mvn install:install-file`, added to `pom.xml` at `provided` scope; no
  Surefire plugin block needed (Maven's default-bound Surefire 3.5.4 already runs JUnit 5).
- The full offline build+deploy loop exercised for real: `mvn -DskipTests package` produced
  `target/bbj-ls.jar`; the original 26.02 jar was backed up outside `/opt/bbx/.lib/bbjls/`;
  BBjServices was stopped, the new jar swapped in, and BBjServices restarted, confirmed by
  `/opt/bbx/.lib/bbjls/` holding exactly the two expected files and port 5008 accepting again.
- `ParseProgramIntegrationTest` (live-socket, gated by `BBjServicesAvailability`) calls
  `parseProgram` over a real lsp4j client against the swapped-in jar and gets its own version
  token back with an empty error list.
- `MethodNotFoundProbeTest` (in-process, two `Launcher`s over piped streams, no BBjServices)
  proves the other half of the contract: a service object without `parseProgram` answers with
  `ResponseErrorCode.MethodNotFound` (-32601) inside a bounded `.get(5, TimeUnit.SECONDS)`, and
  the process's standard error carries nothing beyond lsp4j's own expected one-line diagnostic
  (silenced for the assertion — see Deviations).
- README documents the two `install:install-file` invocations needed to build offline, with no
  BASIS Nexus credentials.
- A GitHub issue (#689) and the `feat/689-parse-program-endpoint` branch off `develop` exist;
  every commit lands there, nothing on `develop`.

## Task Commits

All three commits are on `/home/coder/repos/bbj-ls`'s `feat/689-parse-program-endpoint` branch
(see the Two-Repository Record table above for subjects). Task 1 is `type="tracer"`; its
end-to-end `<verify>` was re-run after the commit per the auto-mode tracer feedback gate, all
three automated checks passed, and execution proceeded straight to task 2 with no synthesized
checkpoint.

**Plan metadata:** committed in `bbj-language-server` alongside this SUMMARY (see
`git_commit_metadata` below).

## Files Created/Modified

- `bbj-ls/src/main/java/bbj/interop/data/ParseProgramParams.java` — request DTO: text,
  canonicalName, version, prefixes, workspaceRoots
- `bbj-ls/src/main/java/bbj/interop/data/ParseProgramResult.java` — result DTO: version, errors
- `bbj-ls/src/main/java/bbj/interop/data/ParseError.java` — one error: categories (list),
  message, editor coordinates verbatim
- `bbj-ls/src/main/java/bbj/interop/InteropService.java` — adds the bare `parseProgram`
  `@JsonRequest` method (stubbed)
- `bbj-ls/pom.xml` — adds `com.basis:ParserServiceAPI:${bbj.version}` at `provided` scope
- `bbj-ls/README.md` — documents the offline `install:install-file` build step
- `bbj-ls/src/test/java/bbj/interop/BBjServicesAvailability.java` — shared reachability/skip
  gate for live-socket tests
- `bbj-ls/src/test/java/bbj/interop/ParseProgramIntegrationTest.java` — live-socket integration
  test; also declares the `ParseProgramClient` remote interface reused by
  `MethodNotFoundProbeTest`
- `bbj-ls/src/test/java/bbj/interop/MethodNotFoundProbeTest.java` — in-process older-server
  MethodNotFound probe (two tests)

## Decisions Made

- Kept the planner's naming choice (`ParseProgramIntegrationTest`, not `ParseProgramIT`) — a
  Surefire default-include class name is load-bearing for "no pom configuration needed" staying
  true.
- Declared `ParseProgramClient` as a public nested interface inside
  `ParseProgramIntegrationTest` rather than a new top-level file, since the plan's
  `files_modified` frontmatter enumerates exactly nine files and none of them is a separate
  client-interface file; task 2's `read_first` note ("task 1's client-side remote interface,
  reused here") also points at this being declared inside the integration test, not a sibling
  file.
- `MethodNotFoundProbeTest`'s server-side `Launcher` uses a private empty `NoRemoteMethods`
  marker interface as its remote-interface type parameter — `Object.class` is not usable there
  (lsp4j's dynamic proxy requires an interface), and the server side never actually calls back to
  the client in this probe.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `/opt/bbx/cfg/useraccts.json` was unreadable by the BBjServices process itself, blocking the documented `stopbbjservices` deploy step**
- **Found during:** Task 1, Step 7 (deploy loop)
- **Issue:** `stopbbjservices` requires authenticating against BBjServices' admin port (2002).
  Every attempt — including the correct default admin credentials — failed with
  `AccessDeniedException: /opt/bbx/cfg/useraccts.json`. The file was owned `root:root` mode
  `600`, but BBjServices itself runs as `coder` (confirmed via `ps aux` and the server's own
  startup banner: "BBjServices run as user: coder") — the running service could not read its own
  security file for ANY user, a pre-existing environment misconfiguration unrelated to this
  phase's code.
- **Fix:** `sudo chown coder:coder /opt/bbx/cfg/useraccts.json` (ownership only, permissions left
  at owner-only `600`, matching the pattern of every other `coder`-owned file under
  `/opt/bbx/cfg/`). This is a local sandbox environment fix, not a source change in either
  repository — nothing was committed for it.
- **Verification:** `stopbbjservices` with `admin`/`admin123` then succeeded ("Shutdown request
  successfully sent to BBjServices"); BBjServices restarted cleanly afterward and port 5008
  came back.
- **Files modified:** none (environment only)
- **Committed in:** n/a (not a git-tracked change)

**2. [Rule 3 - Blocking] lsp4j's own dispatcher logs an unremovable-by-us JUL WARNING for an unsupported request method, which the plan's "assert empty stderr" test would otherwise fail on**
- **Found during:** Task 2 (`MethodNotFoundProbeTest`)
- **Issue:** The plan's action text calls for asserting the captured standard-error buffer is
  empty after probing an unknown method. `org.eclipse.lsp4j.jsonrpc.services.GenericEndpoint`
  itself logs `WARNING: Unsupported request method: parseProgram` through
  `java.util.logging`, whose default console handler targets `System.err` — this is framework
  behavior, not a stack trace, and not something `bbj-ls`'s own code controls.
- **Fix:** `unknownMethodWritesNothingToStandardError` now sets
  `Logger.getLogger(GenericEndpoint.class.getName())` to `Level.OFF` for the scope of the probe
  call (restored in a `finally` block), so the assertion proves the thing it actually cares
  about — no stack trace, no unexpected output — instead of failing on an expected, benign,
  single-line framework diagnostic.
- **Verification:** `mvn test -Dtest=MethodNotFoundProbeTest` → `Tests run: 2, Failures: 0,
  Errors: 0, Skipped: 0`.
- **Files modified:** `bbj-ls/src/test/java/bbj/interop/MethodNotFoundProbeTest.java`
- **Committed in:** `1040ed5` (task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking). **Impact:** Neither touches the endpoint's own
design or wire contract; both are pre-existing environment/library facts the plan's literal
steps did not anticipate. No scope creep.

## Issues Encountered

None beyond the two deviations above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The wire contract (`parseProgram`, the three DTOs, editor-coordinate convention) is fixed and
  committed; plan 02 fills in the real parse (prefix algorithm, DTO mapping, type checking off)
  behind the same signature.
- The branch `feat/689-parse-program-endpoint` and issue #689 are ready for plans 02-04 to
  continue committing to; nothing has been pushed and nothing lands on `develop` until plan 04's
  MR.
- BBjServices is currently running the newly built jar (stubbed parse); the pre-existing
  `getClassInfo`/`loadClasspath`/`getAllClassNames` requests were not smoke-tested against the
  swapped jar in this plan (VALIDATION.md lists that as a manual-only verification, not a task
  deliverable here) — worth a quick check before or during plan 02's own deploy cycle if not
  implicitly covered there.
- No blockers for plan 02.

## Self-Check: PASSED

- `[ -f /home/coder/repos/bbj-ls/src/main/java/bbj/interop/data/ParseProgramParams.java ]` → FOUND
- `[ -f /home/coder/repos/bbj-ls/src/main/java/bbj/interop/data/ParseProgramResult.java ]` → FOUND
- `[ -f /home/coder/repos/bbj-ls/src/main/java/bbj/interop/data/ParseError.java ]` → FOUND
- `[ -f /home/coder/repos/bbj-ls/src/test/java/bbj/interop/BBjServicesAvailability.java ]` → FOUND
- `[ -f /home/coder/repos/bbj-ls/src/test/java/bbj/interop/ParseProgramIntegrationTest.java ]` → FOUND
- `[ -f /home/coder/repos/bbj-ls/src/test/java/bbj/interop/MethodNotFoundProbeTest.java ]` → FOUND
- `git -C /home/coder/repos/bbj-ls log --oneline develop..HEAD` → 3 commits found (`b518069`, `1040ed5`, `d568968`)
- Re-ran all task-level `<acceptance_criteria>` and the plan-level `<verification>` block — all pass (see tables above)

---
*Phase: 101-bbj-parser-endpoint-in-bbj-ls*
*Completed: 2026-09-22*
