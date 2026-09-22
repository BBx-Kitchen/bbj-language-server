---
phase: "101"
slug: "bbj-parser-endpoint-in-bbj-ls"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| (filled by the planner from PLAN.md tasks) | | | PSRV-01, PSRV-02 | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `/home/coder/repos/bbj-ls/src/test/java/bbj/interop/ParseProgramIT.java` — gated integration scenarios for PSRV-01/PSRV-02 (syntax error with positions, clean program → empty list, workspace-root + PREFIX reference, missing reference → BBj's error, quick-succession supersession, timeout/size-cap codes)
- [ ] `/home/coder/repos/bbj-ls/src/test/java/bbj/interop/MethodNotFoundProbeTest.java` — older-server probe via in-process lsp4j `Launcher` pair, no BBjServices needed
- [ ] `/home/coder/repos/bbj-ls/src/test/java/bbj/interop/BBjServicesAvailability.java` — shared "is `127.0.0.1:5008` reachable" skip gate, forceable by system property
- [ ] Framework install: none — `junit-jupiter` already declared, Surefire already new enough; `src/test` directory itself is new

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Older real server answers the probe with MethodNotFound, no hang, no stack trace | PSRV-01 (criterion 4) | Requires swapping the original 26.02 `bbj-ls.jar` back into `/opt/bbx/.lib/bbjls/` and restarting BBjServices | Stop BBjServices, restore the 26.02 jar from the backup outside `bbjls/`, start, wait for :5008, send `parseProgram` once with the plain client, observe MethodNotFound (-32601) and a clean server log; swap the new jar back |
| Pre-existing requests still answer after the jar swap | — (D-17) | Smoke against live BBjServices | Send `getClassInfo`, `loadClasspath`, `getAllClassNames` once against the new jar; each returns a result, not an error |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
