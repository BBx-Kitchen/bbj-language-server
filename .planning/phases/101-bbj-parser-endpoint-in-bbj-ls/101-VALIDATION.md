---
phase: "101"
slug: "bbj-parser-endpoint-in-bbj-ls"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-22"
---

# Phase 101 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 (`junit-jupiter` 5.9.1, already declared in `/home/coder/repos/bbj-ls/pom.xml`, test scope) |
| **Config file** | none — Maven 3.9.16's default-bound Surefire 3.5.4 runs JUnit 5 with no pom configuration |
| **Quick run command** | `mvn -q -f /home/coder/repos/bbj-ls/pom.xml test -Dtest=MethodNotFoundProbeTest` (in-process lsp4j launcher pair, no BBjServices needed) |
| **Full suite command** | `mvn -f /home/coder/repos/bbj-ls/pom.xml test` (BBjServices-gated cases skip themselves when `127.0.0.1:5008` is unreachable) |
| **Estimated runtime** | ~30 seconds (quick) / ~90 seconds (full, against the running BBjServices) |

---

## Sampling Rate

- **After every task commit:** Run `mvn -q -f /home/coder/repos/bbj-ls/pom.xml test -Dtest=MethodNotFoundProbeTest` plus any pure-unit tests (size-cap check)
- **After every plan wave:** Run `mvn -f /home/coder/repos/bbj-ls/pom.xml test` against the freshly deployed jar (D-17 deploy loop first)
- **Before `/gsd-verify-work`:** Full suite must be green; hand replay of the older-server probe against the backed-up 26.02 `bbj-ls.jar` done once
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 101-01-T1 | 01 | 1 | PSRV-01 | — | a live client gets a typed result with the version echoed; no disk read or write | integration (live :5008) | `mvn -f /home/coder/repos/bbj-ls/pom.xml test -Dtest=ParseProgramIntegrationTest -Dbbj.interop.it.requireServer=true` | ✅ | ✅ green |
| 101-01-T2 | 01 | 1 | PSRV-01 | — | a server without the endpoint answers MethodNotFound, no hang, no stack trace | unit (in-process launcher pair) | `mvn -f /home/coder/repos/bbj-ls/pom.xml test -Dtest=MethodNotFoundProbeTest` | ✅ | ✅ green |
| 101-01-T3 | 01 | 1 | — | — | README documents the offline `install:install-file` build | docs | `grep -c install:install-file /home/coder/repos/bbj-ls/README.md` | ✅ | ✅ green |
| 101-02-T1 | 02 | 2 | PSRV-02 | — | `BbjPrefixAlgorithm` serves the active document from memory, resolves from disk in order, returns null on a miss | build + integration (indirect) | `mvn -f /home/coder/repos/bbj-ls/pom.xml test -Dtest=ParseProgramIntegrationTest -Dbbj.interop.it.requireServer=true` | ✅ | ✅ green (indirect — no dedicated unit test; BBj's parser never calls it under type checking off, see the PSRV-02 waiver) |
| 101-02-T2 | 02 | 2 | PSRV-01, PSRV-02 | — | parser runs with type checking off; BBj's JSON errors map to category, message and verbatim coordinates, order kept | unit + integration | `mvn -f /home/coder/repos/bbj-ls/pom.xml test -Dtest=ParseErrorMappingTest,ParseErrorMessageTest,InteropServiceParseProgramTest` | ✅ | ✅ green |
| 101-02-T3 | 02 | 2 | PSRV-02 | — | referenced programs resolved through workspace roots and prefixes | integration (weakened to "call completes") | `mvn -f /home/coder/repos/bbj-ls/pom.xml test -Dtest=ParseProgramIntegrationTest -Dbbj.interop.it.requireServer=true` | ✅ | waived — `.planning/WINDOWS.md` entry 4 (2026-09-22) |
| 101-03-T1 | 03 | 3 | PSRV-02 | — | one worker per connection; the latest request wins for queued, in-flight and identical-token cases | integration + unit | `mvn -f /home/coder/repos/bbj-ls/pom.xml test -Dtest=ParseProgramIntegrationTest,ParserCacheGuardTest -Dbbj.interop.it.requireServer=true` | ✅ | ✅ green |
| 101-03-T2 | 03 | 3 | PSRV-02 | — | size cap, timeout and the fixed application error codes; never reported as a syntax error | unit | `mvn -f /home/coder/repos/bbj-ls/pom.xml test -Dtest=ParseGuardsTest,ParserWorkerFailureTranslationTest,ParserWorkerTimeoutTest` | ✅ | ✅ green |
| 101-03-T3 | 03 | 3 | PSRV-02 | — | closing a connection tears down its worker; a failure logs once at WARNING without a stack trace | unit | `mvn -f /home/coder/repos/bbj-ls/pom.xml test -Dtest=LanguageServiceAcceptLoopTest,ParserWorkerShutdownTest` | ✅ | ✅ green |
| 101-04-T1 | 04 | 4 | PSRV-02 | — | full live-socket suite: supersession, size cap, legacy-probe method wired in | integration (live :5008) | `mvn -f /home/coder/repos/bbj-ls/pom.xml test -Dbbj.interop.it.requireServer=true` | ✅ | ✅ green |
| 101-04-T2 | 04 | 4 | PSRV-01 | — | a real pre-endpoint 26.02 jar answers MethodNotFound; older requests still answer after the swap | manual (jar swap) | — | n/a | manual — see Manual-Only (done once, evidence in 101-04-SUMMARY.md) |
| 101-04-T3 | 04 | 4 | PSRV-01, PSRV-02 | — | the contract description matches the committed Java | docs | — (grep-verified in 101-04-SUMMARY.md) | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `/home/coder/repos/bbj-ls/src/test/java/bbj/interop/ParseProgramIntegrationTest.java` — gated integration scenarios for PSRV-01/PSRV-02 (syntax error with positions, clean program → empty list, workspace-root + PREFIX reference, missing reference → BBj's error, quick-succession supersession, timeout/size-cap codes)
- [x] `/home/coder/repos/bbj-ls/src/test/java/bbj/interop/MethodNotFoundProbeTest.java` — older-server probe via in-process lsp4j `Launcher` pair, no BBjServices needed
- [x] `/home/coder/repos/bbj-ls/src/test/java/bbj/interop/BBjServicesAvailability.java` — shared "is `127.0.0.1:5008` reachable" skip gate, forceable by system property
- [x] Framework install: none — `junit-jupiter` already declared, Surefire already new enough; `src/test` directory itself is new

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Older real server answers the probe with MethodNotFound, no hang, no stack trace | PSRV-01 (criterion 4) | Requires swapping the original 26.02 `bbj-ls.jar` back into `/opt/bbx/.lib/bbjls/` and restarting BBjServices | Stop BBjServices, restore the 26.02 jar from the backup outside `bbjls/`, start, wait for :5008, send `parseProgram` once with the plain client, observe MethodNotFound (-32601) and a clean server log; swap the new jar back |
| Pre-existing requests still answer after the jar swap | — (D-17) | Smoke against live BBjServices | Send `getClassInfo`, `loadClasspath`, `getAllClassNames` once against the new jar; each returns a result, not an error |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — the jar-swap replay is manual-only by design
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter — set by `/gsd-validate-phase` on 2026-09-23

**Approval:** approved 2026-09-23 (validate-phase audit).

---

## Validation Audit 2026-09-23

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Map filled from the plans and summaries and checked against bbj-ls `develop` at `ec9eaf5` (the phase
merged at `e23d400`; later commits are the separately tracked hardening work). Full suite against
the live BBjServices on `127.0.0.1:5008`: 87 tests, 0 failures, 0 errors, 1 skipped (the legacy-server
probe, which only runs with `-Dbbj.interop.it.legacyServer=true`). The build is Maven; there is no
Gradle wrapper.

Accepted, not gaps: `BbjPrefixAlgorithm` has no unit test of its own, and referenced-program
resolution is waived because BBj's parser API never calls the prefix algorithm with type checking
off. A dedicated unit test was offered and declined on 2026-09-23.
