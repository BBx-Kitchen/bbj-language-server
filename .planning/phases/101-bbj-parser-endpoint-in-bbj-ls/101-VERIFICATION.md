---
phase: 101-bbj-parser-endpoint-in-bbj-ls
verified: 2026-09-22T09:45:00Z
status: gaps_found
score: 3/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "The active document is parsed from the supplied text while referenced programs are resolved through the configured prefixes and workspace roots, so a program that USEs or CALLs another file is parsed in context rather than failing on the reference (success criterion 2)."
    status: failed
    reason: >
      BbjPrefixAlgorithm is implemented exactly to spec (in-memory active document, disk
      resolution in the documented order, null on an unresolved name) and passes every
      structural check, but the phase's own plan-02 investigation (temporary trace
      instrumentation, later removed) found that BBj's ParserServiceIF never actually calls
      BbjPrefixAlgorithm.findProgram for any tested USE/CALL shape while type checking is off —
      the setting this endpoint is locked to (D-05). This was tried for a bare USE, USE+declare,
      USE+construct, and a class-extends header, both for a missing file and an existing valid
      one, and confirmed zero invocations across the whole live-socket suite. The finding is
      recorded as an OPEN entry in .planning/WINDOWS.md (id 4) and disclosed in
      101-MR-DESCRIPTION.md's "Observed limitation" paragraph and in the 101-02/101-04 SUMMARYs —
      it is transparently documented, but not resolved, and no VERIFICATION.md override has been
      recorded for it.
    artifacts:
      - path: "/home/coder/repos/bbj-ls/src/main/java/bbj/interop/BbjPrefixAlgorithm.java"
        issue: "Implemented correctly to specification but never observed to be invoked by BBj's own parser under the locked type-checking-off configuration."
      - path: "/home/coder/repos/bbj-ls/src/test/java/bbj/interop/ParseProgramIntegrationTest.java"
        issue: "Scenarios 5-7 (referenceThroughWorkspaceRootParsesCleanly, referenceThroughPrefixEntryParsesCleanly, missingReferenceNeverProducesATransportFailure) were rewritten during plan 02 to assert only 'the call completes normally' rather than 'the reference resolved' / 'a missing reference produces BBj's own error on the referencing line' — the stronger claim in success criterion 2 and decision D-08 is not asserted by any test because it was found not to hold."
    missing:
      - "Either a confirmed working call path from BBj's parser into PrefixAlgorithmIF.findProgram under type checking off (may require BASIS input — this may be a property of ParserServiceAPI itself, not fixable in bbj-ls), or an explicit, accepted-by-a-human override/re-scoping of success criterion 2 and requirement PSRV-02's reference-resolution clause before Phase 102/103 build client-side expectations (diagnostics on USE/CALL lines, D-08's suppress/re-categorize policy) on top of an unverified guarantee."
requirements_coverage:
  - id: PSRV-01
    status: satisfied
    evidence: "Endpoint returns BBj's own parser errors (category list, message, editor line/character range verbatim) with type checking off and no disk I/O for the active document; the legacy-server probe was replayed against the real backed-up 26.02 jar and answered MethodNotFound (-32601) in 0.244s with exactly one WARNING log line and no stack trace."
  - id: PSRV-02
    status: partially_blocked
    evidence: "The 'never returns results of an earlier version of the text' (supersession/latest-wins) half is verified live over the socket in three scenarios. The 'resolves referenced programs through the configured prefixes and workspace roots' half is implemented but not observed working — see the gap above. REQUIREMENTS.md marks PSRV-02 Complete; this verification disputes that for the reference-resolution clause specifically."
---

# Phase 101: BBj Parser Endpoint in bbj-ls Verification Report

**Phase Goal:** BBj's own parser becomes callable on the text a developer is typing — `bbj-ls`
exposes an endpoint that runs `ParserServiceAPI` over supplied document text and hands back the
compiler's errors with editor coordinates.
**Verified:** 2026-09-22T09:45:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Two-Repository Note

This phase's code lives entirely in `/home/coder/repos/bbj-ls` (branch
`feat/689-parse-program-endpoint`, 10 commits on `develop` at `d64b164`, pushed to BASIS GitLab
as `origin/feat/689-parse-program-endpoint` — confirmed: `git -C /home/coder/repos/bbj-ls
rev-parse HEAD origin/feat/689-parse-program-endpoint` both equal `1492d62b...`). The planning
repository `/home/coder/repos/bbj-language-server` has no source changes for this phase — verified
via `git status --porcelain`, which shows only the pre-existing untracked `.planning/milestone.lock`.
The merge request itself is intentionally still to be opened by hand on BASIS GitLab — the phase's
own plan explicitly does not block on it (checkpoint resolved 2026-09-22, "pushed, MR pending").

## Goal Achievement

### Observable Truths

| # | Truth (phase success criterion) | Status | Evidence |
|---|------|--------|----------|
| 1 | A caller gets BBj's own parser errors back (category, message, editor line/character range), type checking off, text never touches disk | ✓ VERIFIED | `BbjPrefixAlgorithm`/`ParserWorker` use only `ByteArrayInputStream`/UTF-8 byte arrays for the active document; `grep -c 'FileWriter\|FileOutputStream\|createTempFile\|Files.write\|Files.createTemp' BbjPrefixAlgorithm.java` = 0; `ParserWorker.parse` maps `ErrorType`(list)/`ErrorMessage`/`ErrorPositionInfo` 1:1 onto `ParseError`; live test `syntaxErrorCarriesPositions` passed against the real deployed jar; `factory.setTypeChecking(false)` called exactly once in the constructor |
| 2 | Referenced programs (USE/CALL) are resolved through the configured prefixes/workspace roots so they parse in context rather than failing on the reference | ✗ FAILED | `BbjPrefixAlgorithm` is correctly implemented, but plan 02's own investigation (trace instrumentation, all combinations tried) found BBj's parser never calls `findProgram` under type checking off, the locked setting this endpoint ships with. `.planning/WINDOWS.md` entry 4 is still `open`. `101-MR-DESCRIPTION.md`'s own "Observed limitation" paragraph and both the 101-02 and 101-04 SUMMARYs disclose this directly. See Gaps below. |
| 3 | Two quick-succession requests for the same document never both yield an errors list from the older text; every request carries its own version identity and a superseded result is discarded | ✓ VERIFIED | `ParserWorker.submit`'s `ConcurrentHashMap<String,PendingParse>` latest-wins design, code-reviewed; live socket tests `supersessionQueuedInterleavingCancelsTheOlderRequest`, `supersessionInFlightInterleavingCancelsTheOlderRequest`, and `identicalVersionTokensStillProduceTwoRequests` all pass against the real deployed jar (re-ran full suite: `Tests run: 20, Failures: 0, Errors: 0, Skipped: 1`) |
| 4 | A plain client exercises all of the above against a live BBjServices; an older BBj answers the same probe with a clean "unknown endpoint" result — no hang, no stack trace | ⚠ PARTIAL | The legacy-probe half is strongly verified: the real, backed-up pre-endpoint 26.02 `bbj-ls.jar` was swapped back into a live BBjServices and answered `parseProgram` with `MethodNotFound` (-32601) in 0.244s, with the service's own stderr log gaining exactly one `WARNING: Unsupported request method: parseProgram` line and nothing else (quoted in 101-04-SUMMARY.md). The "exercises all of the above" half is undermined by truth 2's gap — the client suite cannot exercise reference resolution because the code path was found unreachable |

**Score:** 3/4 truths verified (truth 4 downgraded to partial because it depends on truth 2)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-ls/src/main/java/bbj/interop/data/ParseProgramParams.java` | `text`, `canonicalName`, `version`, `prefixes`, `workspaceRoots` | ✓ VERIFIED | All five fields present exactly as specified |
| `bbj-ls/src/main/java/bbj/interop/data/ParseProgramResult.java` | `version`, `errors` (never extends `WithError`) | ✓ VERIFIED | Both fields present; no `extends WithError` |
| `bbj-ls/src/main/java/bbj/interop/data/ParseError.java` | `categories`(list), `message`, 4 editor-coordinate ints | ✓ VERIFIED | All six fields present, `categories` is `List<String>`, Javadoc states the verbatim/one-based convention |
| `bbj-ls/src/main/java/bbj/interop/BbjPrefixAlgorithm.java` | `PrefixAlgorithmIF` impl, in-memory active doc, disk resolution in order, null on miss | ✓ VERIFIED (implementation) / ✗ see gap (behavior) | Implements the interface correctly and passes every structural grep check; never observed to be called by BBj's parser (see truth 2) |
| `bbj-ls/src/main/java/bbj/interop/ParserWorker.java` | Per-connection factory (built once), latest-wins queue, 5 error codes, 2 system properties, size cap | ✓ VERIFIED | `getProgramFactory` appears exactly once (single call site, in the constructor); `-33001`..`-33005` all present as `static final int`; `bbj.interop.parse.timeoutMs`/`maxBytes` both present with documented defaults and non-positive-override clamping |
| `bbj-ls/src/main/java/bbj/interop/InteropService.java` | `parseProgram` `@JsonRequest`, size-cap check before worker, `SocketAddress` constructor, `shutdownParserWorker()` | ✓ VERIFIED | All present; `parseProgram` calls `ParserWorker.checkSize` then delegates to `parserWorker().submit(params)` |
| `bbj-ls/src/main/java/bbj/interop/LanguageService.java` | Captures `startListening()` future, tears worker down on disconnect | ✓ VERIFIED | `Future<Void> listening = launcher.startListening()`; `awaitDisconnect` calls `interopService.shutdownParserWorker()` |
| `bbj-ls/src/test/java/bbj/interop/BBjServicesAvailability.java` | Reachability gate + forcing property | ✓ VERIFIED (exists, used by all live-socket test classes) |
| `bbj-ls/src/test/java/bbj/interop/ParseProgramIntegrationTest.java` | Live-socket suite, ≥12 `@Test` methods | ✓ VERIFIED | 13 `@Test` methods counted directly in the file |
| `bbj-ls/src/test/java/bbj/interop/MethodNotFoundProbeTest.java` | In-process older-server probe, 2 tests | ✓ VERIFIED | 2 tests present, both pass |
| `bbj-ls/src/test/java/bbj/interop/ParseGuardsTest.java` | Size-cap/code-shape unit tests | ✓ VERIFIED | 5 tests present, all pass |
| `bbj-ls/pom.xml` | `ParserServiceAPI` at `provided` scope, no Surefire plugin block | ✓ VERIFIED | `grep -n 'ParserServiceAPI\|maven-surefire-plugin\|BBjStartup' pom.xml` confirms both deps present, no plugin block |
| `bbj-ls/README.md` | Offline `install:install-file` instructions | ✓ VERIFIED | `grep -c install:install-file README.md` = 2 |
| `101-MR-DESCRIPTION.md` | Contract document, no placeholders | ✓ VERIFIED | Present, matches committed Java field-for-field, includes the "Observed limitation" disclosure |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `InteropService.parseProgram` | `ParserWorker.submit` | direct delegation | ✓ WIRED | `return parserWorker().submit(params);` after the size-cap check |
| `ParserWorker` constructor | `ParserServiceIF.getProgramFactory` | single call site | ✓ WIRED | `grep -c getProgramFactory` = 1, called once in the constructor, never per-request |
| `LanguageService` accept loop | `InteropService.shutdownParserWorker` | via `awaitDisconnect` on the shared executor | ✓ WIRED | `Future<Void> listening` captured and awaited; `interopService.shutdownParserWorker()` called on completion |
| `BbjPrefixAlgorithm.findProgram` | BBj's own parser (`ProgramFactoryIF`/`ParserServiceIF`) | `PrefixAlgorithmIF` contract | ✗ NOT OBSERVABLY WIRED | The Java-level wiring (the interface is implemented and passed to `getProgramFactory`) is present, but BBj's own parser was directly observed to never call back into it under type checking off — see truth 2 |

### Behavioral Spot-Checks / Live Verification

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Whole bbj-ls suite against live BBjServices | `mvn -f /home/coder/repos/bbj-ls/pom.xml test -Dbbj.interop.it.requireServer=true` (re-run by this verifier) | `Tests run: 20, Failures: 0, Errors: 0, Skipped: 1` | ✓ PASS |
| Deployed jar matches the tree under test | `sha256sum` on `/opt/bbx/.lib/bbjls/bbj-ls.jar` vs `target/bbj-ls.jar` | identical (`fcba2575...`) | ✓ PASS |
| Register check (no planning identifiers in branch diff) | `git -C /home/coder/repos/bbj-ls diff -U0 develop..HEAD -- src pom.xml README.md \| grep '^+' \| grep -iE 'PSRV-0\|D-[0-9][0-9]\|101-[0-9][0-9]\|CR-[0-9]'` | no match (exit 1) | ✓ PASS |
| bbj-language-server has no source changes | `git status --porcelain` | only pre-existing untracked `.planning/milestone.lock` | ✓ PASS |
| Branch pushed and MR pending | `git -C /home/coder/repos/bbj-ls rev-parse HEAD origin/feat/689-parse-program-endpoint` | both `1492d62b...` | ✓ PASS (push confirmed; MR-open step is the documented, accepted blocking-human checkpoint) |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| PSRV-01 | Endpoint runs BBj's parser on supplied text, no disk I/O, type checking off, returns category/message/editor range | ✓ SATISFIED | Truths 1 and the legacy-probe half of truth 4 |
| PSRV-02 | Uses supplied text for active document, resolves referenced programs through prefixes/workspace roots, never returns stale-version results | ⚠ PARTIALLY BLOCKED | The "never returns stale-version results" (supersession) clause is satisfied (truth 3). The "resolves referenced programs" clause is implemented but not observed to work — see the gap. REQUIREMENTS.md currently marks this `Complete`; this verification disputes that for the reference-resolution clause. |

No orphaned requirements found — REQUIREMENTS.md maps only PSRV-01/PSRV-02 to Phase 101, and both are declared across the four plans' frontmatter.

### Anti-Patterns Found

None. No `TODO`/`FIXME`/`HACK`/`XXX`/`TBD` markers, no placeholder returns, and no empty handlers
found in any of the phase's Java source files. The one open item (reference-resolution
unreachability) is not a code smell — it is a disclosed, investigated behavioral finding, tracked
in `.planning/WINDOWS.md` entry 4 as `open`.

### Human Verification Required

None beyond the standard human decision already implicit in the gap below (whether to accept the
reference-resolution limitation as a scope change, pursue it with BASIS, or treat it as blocking
before Phase 102/103 build client expectations on it). This is not a "cannot verify
programmatically" item — the codebase evidence is conclusive (open WINDOWS.md entry, disclosed
finding, tests deliberately weakened) — it is a decision about what to do next.

### Gaps Summary

Three of the phase's four success criteria are solidly met: the parser-error contract (categories,
message, verbatim editor coordinates, no disk I/O, type checking off), the supersession/latest-wins
guarantee (proven live under three interleavings including identical version tokens), and the
legacy-server "unknown endpoint" signal (proven against the actual, restored pre-endpoint 26.02
jar, not just an in-process stand-in).

The one substantive gap is success criterion 2: reference resolution through `prefixes` and
`workspaceRoots`. The code (`BbjPrefixAlgorithm`) is implemented exactly to the phase's own design
decisions (D-06 through D-09) and passes every structural check a grep-based verify can run. But
the team's own plan-02 investigation — using temporary trace instrumentation, since removed —
found that BBj's `ParserServiceIF`/`ProgramFactoryIF` never actually calls back into
`findProgram` for any USE/CALL shape tried, as long as type checking stays off (which D-05 locks
this endpoint to). Task 3 of plan 02 rewrote the three reference-resolution integration tests to
assert only "the call completes normally" instead of "the reference resolved" / "a missing
reference is BBj's own error on the referencing line" — the actual claim in success criterion 2 and
in decision D-08. This is honestly and repeatedly disclosed across `.planning/WINDOWS.md` (entry 4,
still `open`), `101-02-SUMMARY.md`, `101-04-SUMMARY.md`, and `101-MR-DESCRIPTION.md`'s own
"Observed limitation" paragraph — but disclosure is not the same as resolution, and no
VERIFICATION.md override has been recorded to formally accept the deviation.

This matters beyond Phase 101 itself: Phase 102 and 103's own designs (diagnostics on USE/CALL
lines, D-08's suppress/re-categorize client policy) currently assume reference resolution works.
Neither Phase 102 nor Phase 103's roadmap success criteria mention or explicitly re-scope this
limitation, so it is not a deferred item under Step 9b's conservative matching rule — it is a live
gap a human needs to weigh in on before downstream phases build on it.
