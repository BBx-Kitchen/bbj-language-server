---
phase: 101-bbj-parser-endpoint-in-bbj-ls
plan: 04
subsystem: api
tags: [lsp4j, json-rpc, bbj-ls, basis-gitlab, contract-documentation]

# Dependency graph
requires:
  - phase: 101-03
    provides: "the concurrency, guard and teardown design (worker queue, five error codes, two system properties, connection-close teardown), proven against a live BBjServices"
provides:
  - "The live-socket suite grown to 13 test methods: supersession in the queued and in-flight interleavings and with identical version tokens, and the size-cap error code exercised over the real socket"
  - "The older-server MethodNotFound behaviour observed on the actual 26.02 jar under a live BBjServices, not only on an in-process stand-in"
  - "101-MR-DESCRIPTION.md — the one contract document Phase 102 and BASIS reviewers both read"
  - "The bbj-ls branch pushed to BASIS GitLab; the merge request itself is still pending a human"
affects: [102]

# Actuals (#2632)
actuals:
  tokens: 5643
  tasks: 4
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Manual, uncommitted throwaway lsp4j client (compiled against the Maven dependency classpath) for a one-off smoke test that must not become a permanent regression test"

key-files:
  created:
    - /home/coder/repos/bbj-language-server/.planning/phases/101-bbj-parser-endpoint-in-bbj-ls/101-MR-DESCRIPTION.md
  modified:
    - /home/coder/repos/bbj-ls/src/test/java/bbj/interop/ParseProgramIntegrationTest.java

key-decisions:
  - "The live timeout scenario (task 1, item 5) was skipped: a supported, reversible mechanism for adding a JVM system property to BBjServices does exist (basis.java.args.BBjServices in the shared /opt/bbx/cfg/BBj.properties), but exercising it would require two additional full BBjServices stop/start cycles on a shared, installation-wide config file immediately before the delicate task 2 jar replay, and the resulting scenario cannot be landed as a permanent test without breaking this task's own Skipped:1 acceptance criterion (a global crippled timeout would fail every other live-socket test). The timeout code's shape stays covered in process by ParseGuardsTest and by ParserWorker's own submit()/runPending() design; this is not part of the plan's own must_haves.truths list."
  - "The MR description's Referenced programs section was corrected to add an 'Observed limitation' paragraph, not present in the plan's own template text, documenting plan 02's finding (WINDOWS.md entry 4) that BbjPrefixAlgorithm.findProgram is never actually invoked by BBj's parser under type checking off for any tested USE/CALL shape — the source (actual observed behaviour) wins over the plan's optimistic template wording"

requirements-completed: [PSRV-01, PSRV-02]

coverage:
  - id: D1
    description: "The live-socket suite proves supersession under both interleavings and with identical version tokens, and the size-cap error code, all over the real socket rather than only in process"
    requirement: PSRV-02
    verification:
      - kind: integration
        ref: "bbj-ls: mvn test -Dbbj.interop.it.requireServer=true -> Tests run: 20, Failures: 0, Errors: 0, Skipped: 1"
        status: pass
      - kind: integration
        ref: "bbj-ls:src/test/java/bbj/interop/ParseProgramIntegrationTest#supersessionQueuedInterleavingCancelsTheOlderRequest"
        status: pass
      - kind: integration
        ref: "bbj-ls:src/test/java/bbj/interop/ParseProgramIntegrationTest#supersessionInFlightInterleavingCancelsTheOlderRequest"
        status: pass
      - kind: integration
        ref: "bbj-ls:src/test/java/bbj/interop/ParseProgramIntegrationTest#identicalVersionTokensStillProduceTwoRequests"
        status: pass
      - kind: integration
        ref: "bbj-ls:src/test/java/bbj/interop/ParseProgramIntegrationTest#oversizeDocumentFailsWithTheSizeCapCodeNeverAsErrorsListEntry"
        status: pass
    human_judgment: false
  - id: D2
    description: "A real pre-endpoint bbj-ls.jar (the backed-up 26.02 build) running under BBjServices answers parseProgram with MethodNotFound quickly and with no stack trace, observed directly rather than derived"
    requirement: PSRV-01
    verification:
      - kind: integration
        ref: "bbj-ls:src/test/java/bbj/interop/ParseProgramIntegrationTest#olderServerAnswersMethodNotFound (run manually against the restored 26.02 jar with -Dbbj.interop.it.legacyServer=true) -> Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.244 s"
        status: pass
    human_judgment: false
  - id: D3
    description: "After the new jar is swapped back in, getClassInfo, loadClasspath and getAllClassNames each still answer with a result rather than an error"
    requirement: PSRV-02
    verification:
      - kind: other
        ref: "throwaway lsp4j client (uncommitted, scratchpad-only) against the restored build: getClassInfo(java.lang.String) -> 93 methods, no error; loadClasspath([]) -> true; getAllClassNames() -> 90086 names"
        status: pass
    human_judgment: false
  - id: D4
    description: "The contract is written down once, checked against the committed Java, matches it exactly, and the branch is pushed (or the exact push error is recorded)"
    requirement: PSRV-01
    verification:
      - kind: other
        ref: "grep checks on 101-MR-DESCRIPTION.md: parseProgram (4), the five -3300[1-5] codes (9 occurrences), no bracketed placeholder; git -C bbj-ls push -u origin feat/689-parse-program-endpoint succeeded, HEAD == origin/feat/689-parse-program-endpoint"
        status: pass
    human_judgment: true
    rationale: "The MR description's prose accuracy against the committed Java (field names, codes, defaults) is grep-verified structurally, but whether the document reads well and states the contract usefully for a human reviewer is a judgment call, not something a grep can certify."

# Metrics
duration: ~35min
completed: 2026-09-22
status: complete
---

# Phase 101 Plan 04: BBj Parser Endpoint — Verification Close-out & Contract Summary

**Grew the live-socket suite to 13 test methods proving supersession (both interleavings, identical tokens) and the size-cap code over the real socket, replayed the older-server probe against the actual backed-up 26.02 jar (MethodNotFound in 0.244s, one WARNING line, no stack trace), confirmed the three pre-existing interop requests survive the jar swap, wrote and committed the parseProgram contract document, and pushed the branch to BASIS GitLab — the merge request itself is still pending a human (task 4, blocking-human checkpoint).**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-09-22T08:58Z
- **Tasks:** 3 of 4 (task 4 is the blocking-human checkpoint this plan stops at)
- **Files modified:** 2 (1 created, 1 modified) — 1 in `bbj-language-server`, 1 in `bbj-ls`

## Two-Repository Record

**bbj-ls branch:** `feat/689-parse-program-endpoint` (continued from plans 01-03, cut from `develop`
at `d64b164`) — **now pushed to `origin` on BASIS GitLab**, tracking
`origin/feat/689-parse-program-endpoint`, ref `1492d62b5ff2bad5ae38441e2b7b62dcbb7f2449` (identical
to local `HEAD`).

**GitHub issue:** [#689](https://github.com/BBx-Kitchen/bbj-language-server/issues/689) —
"bbj-ls: add parseProgram endpoint over BBj's own parser"

**Every commit on the branch (plans 01-04, `develop..HEAD`, oldest first):**

| Commit | Subject | Plan |
|--------|---------|------|
| `b518069` | `feat(#689): add parseProgram endpoint wiring and live-socket test` | 01 |
| `1040ed5` | `test(#689): pin older-server MethodNotFound behavior in-process` | 01 |
| `d568968` | `docs(#689): document offline install of the com.basis jars` | 01 |
| `b8809d4` | `feat(#689): resolve the active document in memory and referenced programs from disk` | 02 |
| `b64a9a8` | `feat(#689): run BBj's parser and map its JSON errors onto the DTO` | 02 |
| `aa19893` | `test(#689): deploy the real parse and grow the live-socket suite to 8 scenarios` | 02 |
| `0613f11` | `feat(#689): serialize parses onto one worker thread per connection, latest-wins` | 03 |
| `92fc543` | `feat(#689): add size cap, timeout wiring and five application error codes` | 03 |
| `239aa24` | `feat(#689): tear the parser worker down on connection close, log failures once` | 03 |
| `1492d62` | `test(#689): exercise supersession, size cap and the legacy-server probe over the socket` | 04 |

**Merge request:** MR not yet opened — awaiting a human (task 4). The push itself succeeded (see
below); this is not a push failure, only the MR-opening step, which needs BASIS GitLab's web UI or
`glab` (not installed on this machine).

**Push outcome:** `git -C /home/coder/repos/bbj-ls push -u origin feat/689-parse-program-endpoint`
succeeded on the first attempt — `* [new branch] feat/689-parse-program-endpoint ->
feat/689-parse-program-endpoint`, tracking set up. SSH access from this container to
`git.basis.cloud:10022` had never been exercised before this plan; it worked.

**Final `mvn test -Dbbj.interop.it.requireServer=true` run** (whole module, live BBjServices
required, current new-build jar deployed): `Tests run: 20, Failures: 0, Errors: 0, Skipped: 1` —
`MethodNotFoundProbeTest` (2) + `ParseGuardsTest` (5) + `ParseProgramIntegrationTest` (13, one of
which — the legacy-server probe — is the single expected skip).

**Register-check outcome (branch diff, `develop..HEAD`, `src pom.xml README.md`):** CLEAN — no
`PSRV-0`, `D-NN`, `101-NN` or `CR-N` token found in any added line.

## Legacy-Server Replay — Captured Evidence

Down-swap → probe → up-swap, all driven directly, no fixture files:

1. **Down-swap.** `stopbbjservices` (piped `admin`/`admin123`, defaults elsewhere, `n` to not
   wait) stopped BBjServices cleanly in ~2s with no lingering process this cycle. The new build
   (`bbj-ls.jar`, SHA-256 `fcba2575...`, matching plan 03's deployed hash) was copied to the
   session scratchpad — never inside `bbjls/` — then the backed-up 26.02 jar
   (`/opt/bbx/.lib/bbjls-backup/bbj-ls.jar.26.02`, 23,389 bytes) was copied into
   `/opt/bbx/.lib/bbjls/bbj-ls.jar`, confirmed byte-identical to the backup. `bbjservices` was
   started and `127.0.0.1:5008` accepted within 2s.
2. **Probe.** `mvn -f pom.xml test -Dtest=ParseProgramIntegrationTest#olderServerAnswersMethodNotFound -Dbbj.interop.it.requireServer=true -Dbbj.interop.it.legacyServer=true` →
   **`Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.244 s`**. The test asserts
   `ResponseErrorCode.MethodNotFound.getValue()` (-32601) as the failure code — it passed, meaning
   the real 26.02 jar answered with exactly that code, in 0.244 s (well under the 5 s bound).
3. **Log evidence.** `/opt/bbx/log/bbjservices.err` was freshly created by this restart (the
   launcher overwrites it on start, so a byte-count delta across restarts is meaningless; the
   socket-related lines were grepped instead to isolate exactly what the probe added). Since the
   listener started, the log's only socket-related lines are:
   ```
   [2026-09-22T08:53:09+0000] INFO: BBj Language Service at /127.0.0.1:5008 accepted new connection from /127.0.0.1:45106
   [2026-09-22T08:53:16+0000] INFO: BBj Language Service at /127.0.0.1:5008 accepted new connection from /127.0.0.1:35980
   [2026-09-22T08:53:16+0000] INFO: BBj Language Service at /127.0.0.1:5008 accepted new connection from /127.0.0.1:35994
   [2026-09-22T08:53:16+0000] WARNING: Unsupported request method: parseProgram
   ```
   The first line (08:53:09) is this plan's own bounded `:5008`-readiness poll, made before the
   probe ran. The three lines at 08:53:16 — matching the probe's own `Finished at:
   2026-09-22T08:53:16Z` — are the probe itself: the test class's `BBjServicesAvailability`
   reachability check opening and closing one socket, the actual client socket opening, and
   exactly **one** `WARNING` line from the unrecognized method. No stack trace, no other output —
   the probe added exactly one line beyond its own two connection-accept lines.
4. **Up-swap.** `stopbbjservices` again (clean, ~2s, no lingering process), the new build restored
   from the scratchpad into `/opt/bbx/.lib/bbjls/bbj-ls.jar` (confirmed via SHA-256
   `fcba2575...`, matching the pre-down-swap hash exactly), scratch copy deleted, `bbjservices`
   started, `:5008` accepted within 2s.
5. **Smoke test.** A throwaway, uncommitted lsp4j client (compiled against the Maven dependency
   classpath in the session scratchpad, never landed in either repository) sent one request each
   for the three pre-existing interop methods over a fresh connection:
   - `getClassInfo({className: "java.lang.String"})` → `name=java.lang.String, error=null,
     methods=93`
   - `loadClasspath({classPathEntries: []})` → `true`
   - `getAllClassNames()` → `count=90086`
6. **Final confirmation.** `mvn test -Dbbj.interop.it.requireServer=true` (whole module) →
   `Tests run: 20, Failures: 0, Errors: 0, Skipped: 1` — the box is back in its working state.

Throughout, `/opt/bbx/.lib/bbjls/` held exactly `bbj-ls.jar` and
`org.eclipse.lsp4j.jsonrpc-0.20.1.jar` at every resting point, and
`/opt/bbx/.lib/bbjls-backup/bbj-ls.jar.26.02` is present, unchanged, 23,389 bytes at the end of this
plan.

## Timeout Scenario — Named, Accepted Gap

The live timeout scenario (task 1's item 5) was **not run**. `/opt/bbx/bin/bbjservices` was read in
full: a supported, reversible mechanism for adding a JVM system property to BBjServices does exist
— the `basis.java.args.BBjServices` key in the shared, installation-wide
`/opt/bbx/cfg/BBj.properties` file, read via `getPropertyValue` before every restart — but
exercising it here would mean two additional full BBjServices stop/start cycles on a shared config
file immediately before task 2's delicate 26.02-jar replay, and the resulting evidence could not be
landed as a permanent regression test without breaking this task's own `Skipped: 1` acceptance
criterion (a globally crippled timeout would fail every other live-socket scenario in the same
suite, since `bbj.interop.parse.timeoutMs` is read once at the server JVM's class-load time, not
per test). The timeout code's shape (`-33002`, structurally distinct and below both reserved
bands) stays covered in process by `ParseGuardsTest`, and the abandoned-parse/overrunning-marker
design is covered by code review (plan 03). This scenario is not part of the phase's own
`must_haves.truths` list. Carried as a named, accepted gap — not a silent one.

## Accomplishments

- `ParseProgramIntegrationTest` grew from 8 to 13 `@Test` methods: `supersessionQueuedInterleavingCancelsTheOlderRequest`,
  `supersessionInFlightInterleavingCancelsTheOlderRequest`, `identicalVersionTokensStillProduceTwoRequests`,
  `oversizeDocumentFailsWithTheSizeCapCodeNeverAsErrorsListEntry`, and `olderServerAnswersMethodNotFound`
  (the last gated by `@EnabledIfSystemProperty(named = "bbj.interop.it.legacyServer", matches =
  "true")`, disabled by default).
- All three supersession scenarios assert `ResponseErrorCode.RequestCancelled.getValue()` on the
  older request and a normal, version-matched result on the newer one — the queued interleaving,
  a best-effort in-flight interleaving (asserting outcome only, not which interleaving occurred, per
  the plan's own instruction), and an identical-version-token pair proving the server never
  short-circuits on equality.
- The size-cap scenario builds a ~5 MiB document in memory (no fixture file) and asserts the
  literal `-33003` code, never an entry in the errors list.
- The older-server behaviour was replayed against the real, backed-up 26.02 `bbj-ls.jar` running
  under BBjServices — not only against the plan 01 in-process stand-in — and the three pre-existing
  interop requests were confirmed to still answer after the jar was restored.
- `101-MR-DESCRIPTION.md` was written by copying the plan's own MR-description text, substituting
  every bracketed placeholder with the value read from the committed Java (`ParseProgramParams`,
  `ParseProgramResult`, `ParseError` field names; the five `-3300x` codes; the two system-property
  defaults) and from plan 01's SUMMARY (issue #689), and adding one paragraph beyond the plan's
  template — an "Observed limitation" callout in the Referenced-programs section, corrected against
  plan 02's actual finding (the disk-resolution path is implemented but was never observed to be
  invoked by BBj's own parser under type checking off).
- The branch was pushed to BASIS GitLab on the first attempt: `git -C bbj-ls push -u origin
  feat/689-parse-program-endpoint` succeeded, no authentication or host-key error encountered.

## Task Commits

1. **Task 1: Supersession, the size cap and the timeout, proved over the real socket** —
   `1492d62` (test, in `bbj-ls`) — timeout scenario skipped as a named, accepted gap (see above)
2. **Task 2: Replay the probe against the real 26.02 jar, then restore and smoke the old requests**
   — no commit (deploy-loop and manual verification only, exactly as the plan specifies; `git -C
   bbj-ls status --porcelain` stayed empty throughout)
3. **Task 3: Write the contract document and push the branch** — `3103976d` (docs, in
   `bbj-language-server`) — plus the successful `git push` to BASIS GitLab (no commit, a remote
   ref update)
4. **Task 4: Open the merge request on BASIS GitLab** — not started; this is the blocking-human
   checkpoint this plan stops at

**Plan metadata:** will be committed alongside `STATE.md`/`ROADMAP.md` once the phase is fully
closed out (after the checkpoint resolves) — not part of this SUMMARY's own commit, per the
checkpoint protocol (SUMMARY is written and committed now so the checkpoint's "Completed Tasks"
table has durable, on-disk evidence; `STATE.md`/`ROADMAP.md`/`REQUIREMENTS.md` updates follow in
the state-update steps below, run before the checkpoint is returned).

## Files Created/Modified

- `bbj-language-server/.planning/phases/101-bbj-parser-endpoint-in-bbj-ls/101-MR-DESCRIPTION.md` —
  the parseProgram contract document (new)
- `bbj-ls/src/test/java/bbj/interop/ParseProgramIntegrationTest.java` — five new test methods
  (supersession × 3, size cap, gated legacy probe)

## Decisions Made

- Skipped the live timeout scenario as a named, accepted gap (see "Timeout Scenario" section
  above) — a reversible mechanism exists but using it here was judged too risky relative to its
  value, given it is not part of the phase's own must-have truths and cannot be landed as a
  permanent test without breaking this task's own skip-count acceptance criterion.
- Corrected the MR description's Referenced-programs section against plan 02's actual finding
  (WINDOWS.md entry 4) rather than shipping the plan's optimistic template wording as fact — the
  source (observed behaviour) wins over the plan text, per this task's own instruction.
- Used a throwaway, uncommitted lsp4j client (compiled against the Maven dependency classpath) for
  the post-up-swap smoke test of the three pre-existing interop requests, exactly as the plan
  permits ("a throwaway client run is fine here, nothing needs to be committed for the smoke").

## Deviations from Plan

None — plan executed exactly as written, with two conditional choices explicitly reserved to
Claude's discretion by the plan itself (the timeout scenario's skip/run decision, and the
reference-resolution correction to the MR text) both resolved and documented above rather than
silently assumed.

## Issues Encountered

None. Both BBjServices stop/start cycles in this plan (down-swap and up-swap) completed cleanly
within ~2 seconds each, with no lingering process — unlike the intermittent lingering-process issue
plans 01-02 encountered.

## User Setup Required

**Yes — this plan ends at a blocking-human checkpoint (task 4).** The branch is pushed; opening the
merge request on BASIS GitLab needs a human, since `glab` is not installed on this machine and
opening a merge request has no other CLI/API path from here. See the checkpoint returned alongside
this SUMMARY for the exact instructions.

## Next Phase Readiness

- The endpoint, its concurrency design, its guards, and its contract document are all complete,
  committed, and proven against a live BBjServices — including, in this plan, against the actual
  pre-endpoint 26.02 jar, not only an in-process stand-in.
- The branch is on BASIS GitLab (`feat/689-parse-program-endpoint`), tracking
  `origin/feat/689-parse-program-endpoint`. Merging is the BASIS maintainers' call and does not
  block Phase 102, per the phase's own D-18 decision — Phase 102 can proceed once this plan's
  checkpoint is acknowledged, without waiting for the merge itself.
- Two open items remain for Phase 102/103 to weigh, both already flagged in `WINDOWS.md` (entry 4)
  and now also in the MR description's "Observed limitation" paragraph: whether
  `BadUseDeclarationError`/reference resolution is reachable at all under `setTypeChecking(false)`,
  and — new to this plan — that the timeout code's live-socket coverage stops at the in-process
  `ParseGuardsTest` level, not the real BBjServices process.
- Task 4 (open the BASIS GitLab merge request) is the only remaining step to close Phase 101.

## Self-Check: PASSED

- `[ -f /home/coder/repos/bbj-language-server/.planning/phases/101-bbj-parser-endpoint-in-bbj-ls/101-MR-DESCRIPTION.md ]` → FOUND
- `[ -f /home/coder/repos/bbj-ls/src/test/java/bbj/interop/ParseProgramIntegrationTest.java ]` → FOUND (modified, not created)
- `git -C /home/coder/repos/bbj-ls log --oneline develop..HEAD` → 10 commits found (plans 01-03's 9
  + this plan's `1492d62`)
- `git -C /home/coder/repos/bbj-ls rev-parse HEAD origin/feat/689-parse-program-endpoint` → both
  equal `1492d62b5ff2bad5ae38441e2b7b62dcbb7f2449` (push confirmed landed)
- Re-ran all task-level `<acceptance_criteria>` for tasks 1-3 and the plan-level automated
  `<verification>` items reachable without task 4 — all pass (see tables and evidence above)
- `git -C /home/coder/repos/bbj-ls status --porcelain` → empty
- `git -C /home/coder/repos/bbj-language-server status --porcelain -- bbj-vscode bbj-intellij java-interop examples` → empty (no source file in this repository changed)

---
*Phase: 101-bbj-parser-endpoint-in-bbj-ls*
*Completed: 2026-09-22 (through task 3; task 4 pending)*
