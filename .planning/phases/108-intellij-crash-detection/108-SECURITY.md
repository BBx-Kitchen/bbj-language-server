---
phase: "108"
slug: "intellij-crash-detection"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-25"
---

# Phase 108 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Node.js language-server process → plugin | LSP4IJ's process listener passes the pid and exit code into plugin log lines and into the crash policy | pid, exit code (low sensitivity) |
| LSP4IJ process-wait thread → plugin | the unexpected-stop callback runs plugin code off the EDT | control flow (crash verdict, restart request) |
| BbjServerService state → UI | the widget (EDT) and the banner provider (background collection) read the crashed and abandoned flags | two booleans |
| maintainer's idea.log and screen observations → public repository | pasted log lines enter the committed `108-UAT-ARTIFACTS.md` | log lines that may contain home and project paths (medium) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-108-01 | Information disclosure | `108-UAT-ARTIFACTS.md` probe excerpt | medium | mitigate | Redaction rule at lines 3-4 and 35; pasted lines use `<home>`/`<project>` (e.g. lines 60, 73); `grep -cE '/Users/[^<]'` = 0 | closed |
| T-108-02 | Information disclosure | INFO lines in `BbjLanguageServer` | low | accept | Stop line logs pid and liveness only (`BbjLanguageServer.java:138`); launch line unchanged | closed |
| T-108-03 | Denial of service | the probe build | low | mitigate | Probe added log lines only (108-01); restart behaviour changed in 108-02 under T-108-05/06 | closed |
| T-108-04 | Repudiation | probe evidence | low | mitigate | UAT artifacts label rows `derived` / `observed` against pasted idea.log lines | closed |
| T-108-05 | Denial of service (restart storm) | `applyCrashPolicy`, `requestGatedRestart` | medium | mitigate | `applyCrashPolicy` calls `requestGatedRestart(CRASH_RESTART_DELAY_MS)` on crash 1 only, never `clearCrashState()`; crash 2 within `CRASH_WINDOW_MS` sets `autoRestartAbandoned` (`BbjServerService.java:259-307`); exactly one `restartGate.request(` site (`:371`) | closed |
| T-108-06 | Tampering (crash hidden as expected stop) | `ExpectedStopGuard` token lifetime | medium | mitigate | Token is one-shot (`classifyExit` clears it before deciding) and time-boxed; pid identity overrides the window when both sides carry a pid (`ExpectedStopGuard.java:111-128`); `doRestart` arms before the stop and disarms after a timely stop, between `BoundedWait.until(` and `manager.start(SERVER_ID)` (`BbjServerService.java:416-446`); a timed-out stop keeps a pid-bound token, so a crash of the new server is still a crash | closed |
| T-108-07 | Denial of service (UI thread) | `reportUnexpectedExit` off the EDT | low | mitigate | Calling thread runs only the synchronized verdict and logging; state/UI work goes through `invokeLater` with `isDisposed()` guards; `onUnexpectedStop` catches `RuntimeException` (`BbjLanguageServer.java:118-122`) | closed |
| T-108-08 | Information disclosure | WARN lines | low | accept | `describeExit(pid, exitCode)` only; no command line, environment or process output | closed |
| T-108-09 | Information disclosure | `108-UAT-ARTIFACTS.md` probe verdict | low | mitigate | Same redaction as T-108-01; `grep -cE '/Users/[^<]'` = 0 | closed |
| T-108-10 | Denial of service (misleading UI) | banner for a quiet first crash | low | mitigate | Banner gated on `isAutoRestartAbandoned()` only (`BbjServerCrashNotificationProvider.java:30`); pinned by `BbjServerCrashNotificationProviderSourceGuardTest` | closed |
| T-108-11 | Tampering (stale read) | flags read off the EDT | low | mitigate | `serverCrashed`, `autoRestartAbandoned`, `crashCount`, `lastCrashTime`, `pendingRestartReason` are `volatile` (`BbjServerService.java:72-93`) | closed |
| T-108-12 | Information disclosure | `108-UAT-ARTIFACTS.md` scenario excerpts | medium | mitigate | Redaction rule applied; `grep -cE '/Users/[^<]'` = 0; no BBj source text pasted | closed |
| T-108-13 | Repudiation | UAT verdict | medium | mitigate | Unexercised rows stay `derived`; `missing` rows are recorded as missing, not converted to passes (e.g. S7.8) | closed |
| T-108-14 | Information disclosure | planning identifiers in shipped source | low | mitigate | Register grep over the phase's added lines in `bbj-intellij`, `bbj-vscode/src`, `documentation` prints nothing | closed |
| T-108-SC | Tampering | package installs | low | accept | No change to `package.json`, lockfiles, `*.gradle.kts`, version catalog or wrapper properties in the phase diff | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-108-01 | T-108-02 | idea.log INFO lines carry pid, liveness and thread name only; these are local diagnostics with no secrets | plan-time threat model (108-01) | 2026-09-25 |
| AR-108-02 | T-108-08 | WARN lines carry pid and exit code only | plan-time threat model (108-02) | 2026-09-25 |
| AR-108-03 | T-108-SC | No new or updated packages; existing lockfiles and pinned Gradle wrapper | plan-time threat model (108-01..04) | 2026-09-25 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-25 | 15 | 15 | 0 | /gsd-secure-phase orchestrator (L1 grep verification; auditor skipped per ASVS 1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-25
