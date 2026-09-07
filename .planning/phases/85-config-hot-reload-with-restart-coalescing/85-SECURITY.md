---
phase: "85"
slug: "config-hot-reload-with-restart-coalescing"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-07"
---

# Phase 85 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| filesystem → language server | The resolved config file's bytes are read by the server and drive PREFIX/USE resolution; `fs.watch` events on the config directory trigger re-reads. | Config file contents (PREFIX lines), directory change events — local, user-owned |
| IDE settings push → language server | `onDidChangeConfiguration` re-resolves `bbj.configPath` and re-arms the filesystem watch. | Settings-supplied config path string |
| language server → VS Code extension host | The `bbj/configReloadRequired` notification crosses the LSP connection and causes the host to stop/start its language client. | `{ path: string \| null, reason: ConfigReloadReason }` |
| language server → IntelliJ plugin (LSP4IJ/lsp4j) | The same notification is deserialized by the vendored Gson and drives a plugin-side coalesced restart. | Same JSON payload, Gson-deserialized into `ConfigModels.ConfigReloadNotification` |
| extension / plugin → user surface | Status-bar text, tooltip and output-channel / console lines carry the resolved config path and reason. | Resolved config path, reason token / label — user's own window |
| planning artifact → release gate | `COVERAGE.md` is read by the seal-time API-coverage gate; QA checklist rows are followed by a human tester. | Coverage declaration text, QA steps |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-85-01 | Tampering | config file contents read by `extractConsumedConfigContent` (`config-path-resolver.ts`) | medium | accept | Server already fully trusts this file at `initializeWorkspace`; the hot-reload path widens *when* it is read, not *whether* it is trusted, and reuses the same single-line scan (source-scan test asserts one module). | closed |
| T-85-02 | Denial of Service | `config-watcher.ts` event → restart path (self-inflicted loop class, #232) | high | mitigate | `CONFIG_WATCH_DEBOUNCE_MS = 1000` trailing-edge debounce (`config-watcher.ts:33`, `:247`); relevance gate returns early when `next === snapshot` (`:260`) and advances `snapshot = next` before `waitForQuiescenceThenNotify` (`:264-266`). Verified by `test/config-hot-reload.test.ts`. | closed |
| T-85-03 | Denial of Service | bounded quiescence wait in `config-watcher.ts` | medium | mitigate | `QUIESCENCE_POLL_MS = 100`, `QUIESCENCE_TIMEOUT_MS = 5000` cap the wait (`:41`, `:48`, `:199-203`); single `pendingQuiescenceTimer` handle with cancel-then-schedule; `dispose()` calls `clearPendingQuiescenceTimer()` (`:331-336`). Verified by `test/config-hot-reload-wiring.test.ts`. | closed |
| T-85-05 | Denial of Service | `fs.watch` handle lifetime across re-arms | medium | mitigate | `start()` and `updateResolvedPath()` call `closeHandle()` before `armWatch()` (`:289-292`, `:305-306`); watch opened with `{ persistent: false }` (`:84`); `dispose()` closes the handle and clears both timers; `armWatch` failure path leaves `handle` null and warns once per path. | closed |
| T-85-07 | Denial of Service | detached watch/debounce callbacks | medium | mitigate | Every detached callback body (`fs.watch` error handler, debounce callback, relevance evaluation, quiescence poll, arm) is wrapped in try/catch routed to `logWarn` (`config-watcher.ts:188-211`, `:224-230`, `:235-249`, `:254-268`, `:276-281`). | closed |
| T-85-08 | Information disclosure | warning log lines naming the config path | low | accept | The resolved path is already logged by `initializeWorkspace` and surfaced by Phase 84's missing-file warning; no new disclosure. | closed |
| T-85-09 | Denial of Service | repeated `bbj.configPath` settings pushes re-arming the watch | medium | mitigate | `updateResolvedPath` is a no-op before `start()` (`:302-304`), closes the previous handle before arming (`:305-306`), dedupes arm-failure warnings via `warnedPaths` (`:146`, `:216-220`), and routes through the single-slot quiescence wait so a settings storm yields at most one outstanding wait. | closed |
| T-85-10 | Tampering | settings-supplied config path pointing at an attacker-writable directory | low | accept | The path is already resolved and trusted by Phase 84's `resolveConfigPath`; the watcher only observes the directory that resolution already named. No new trust extended, no content executed. | closed |
| T-85-11 | Denial of Service | `hasPendingWork()` polled on a hot path | low | accept | Two field reads plus a map-size read, polled at most every 100 ms and only while a reload is pending. | closed |
| T-85-12 | Denial of Service | notification storm driving repeated VS Code client restarts | high | mitigate | `restart-gate.ts` cancel-then-schedule coalescing (`clearTimer` before `setTimer`, one pending handle) collapses every request within the 500 ms window into one stop/start pair; server-side relevance gate + 1000 ms debounce prevent storms from ordinary saves; source guard in `test/config-reload-host.test.ts` (lines 468-560) fences exactly one `client.start()`/`client.stop(` in `extension.ts` and exactly one `createRestartGate(`. | closed |
| T-85-13 | Denial of Service | `stop()` on a non-running client, or rejected `start()` wedging the extension | medium | mitigate | `restart-gate.ts:83-90`: `if (target.needsStop()) await target.stop()` then `await target.start()` inside try/catch reporting `onPhase('failed', error)`; the `failed` phase hides the status item and reuses the existing `showErrorMessage`. Tests at `config-reload-host.test.ts:75`, `:99`, `:113`, `:385`. | closed |
| T-85-14 | Denial of Service | scheduled restart racing extension shutdown | medium | mitigate | `extension.ts:997-1002`: `deactivate()` calls `restartGate?.cancel()` before `client.stop()`; source guard asserts the gate-cancel precedes `client.stop(` inside `deactivate()` (`config-reload-host.test.ts:436`, `:521`). | closed |
| T-85-15 | Information disclosure | status-bar tooltip and output-channel line naming the full config path | low | accept | Path is already surfaced by Phase 84's missing-file warning, the Show-config command and the run argv; the surface is the user's own window. | closed |
| T-85-16 | Spoofing | notification payload arriving from something other than the language server | low | accept | The LSP connection is the trust boundary and is established by the extension itself against a bundled server module; no third party can address the client's notification handlers. | closed |
| T-85-17 | Denial of Service | repeated reload notifications restarting the IntelliJ language server | high | mitigate | `BbjLanguageClient.configReloadRequired` (`:106-120`) calls `service.requestRestart(BbjServerService.RESTART_DEBOUNCE_MS)` — the same 500 ms constant `scheduleRestart()` uses (`BbjServerService.java:43`, `:254-255`) — so settings-apply and reload pushes coalesce through the existing gate. `BbjLanguageClientRestartSourceGuardTest` asserts exactly one restart request with the shared constant and no direct `LanguageServerManager` use. | closed |
| T-85-18 | Tampering | malformed or version-skewed payload crossing the LSP4IJ boundary (G-81-4/G-81-5 class) | medium | mitigate | `ConfigModelsJsonBoundaryTest` round-trips the DTO through the lsp4j Gson with every field populated (`:83`), with a null path (`:97`), and with an unknown reason (`:111`); `ConfigReloadNotificationContractTest` pins the method name, both field names and every reason token across TypeScript and Java. | closed |
| T-85-19 | Information disclosure | IntelliJ tooltip and console line naming the config path | low | accept | Path is already surfaced by Phase 84's missing-config balloon and the run action's `-c` argument; the surface is the user's own IDE. | closed |
| T-85-20 | Elevation of privilege | unknown `reason` token rendered verbatim into the tooltip | low | mitigate | `ConfigReloadPresentation.reasonLabel` returns `null` for null and for any unrecognized token (`:24-36`); `widgetTooltip` shows status text alone when the label is null/blank (`:45-49`). Only the plugin's own label strings reach the UI; the raw token appears only in the developer-facing console line. `ConfigReloadPresentationTest:35`. | closed |
| T-85-21 | Repudiation | fabricated coverage matrix hiding an undecided capability gap | medium | mitigate | `COVERAGE.md` is a single line, 143 bytes, beginning `No external API integration:`; no table present. Re-verified 2026-09-07. | closed |
| T-85-22 | Tampering | edit silently renumbering or removing an existing QA checklist row | medium | mitigate | `git diff --numstat 9b6ba199~1 HEAD -- QA/FULL-TEST-CHECKLIST.md` reports `6 0` (six insertions, zero deletions) across both 85-05 commits. Re-verified 2026-09-07. | closed |
| T-85-23 | Information disclosure | checklist steps naming a real customer path or credential | low | accept | Rows name only placeholder paths and settings names; no environment-specific value is written. | closed |
| T-85-SC | Tampering | npm/pip/cargo installs (supply chain; declared identically in all five plans) | low | accept | No plan added a package-manager install task or a new dependency; Gradle pins unchanged. The package-legitimacy gate has nothing to audit. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-85-01 | T-85-01 | Config file was already fully trusted at `initializeWorkspace`; hot reload changes read timing only, with the same single-line scan. | plan author (85-01 threat model) | 2026-09-06 |
| AR-85-02 | T-85-08 | Config path already logged by `initializeWorkspace` and Phase 84's missing-file warning. | plan author (85-01 threat model) | 2026-09-06 |
| AR-85-03 | T-85-10 | Path already resolved and trusted by Phase 84's `resolveConfigPath`; watcher observes only that directory and executes nothing. | plan author (85-02 threat model) | 2026-09-06 |
| AR-85-04 | T-85-11 | Predicate is two field reads plus a map-size read, polled every 100 ms only while a reload is pending. | plan author (85-02 threat model) | 2026-09-06 |
| AR-85-05 | T-85-15 | Path already surfaced by Phase 84 warning, Show-config command and run argv; surface is the user's own window. | plan author (85-03 threat model) | 2026-09-06 |
| AR-85-06 | T-85-16 | LSP connection is the trust boundary, established by the extension against a bundled server module. | plan author (85-03 threat model) | 2026-09-06 |
| AR-85-07 | T-85-19 | Path already surfaced by Phase 84 balloon and the run action's `-c` argument; surface is the user's own IDE. | plan author (85-04 threat model) | 2026-09-06 |
| AR-85-08 | T-85-23 | QA rows name only placeholder paths and settings names. | plan author (85-05 threat model) | 2026-09-06 |
| AR-85-09 | T-85-SC | No new dependency or install task in any of the five plans; Gradle pins unchanged. | plan author (85-01..05 threat models) | 2026-09-06 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-07 | 22 | 22 | 0 | /gsd-secure-phase orchestrator (L1 grep-depth; register authored at plan time, ASVS 1, auditor short-circuit) |

Evidence run 2026-09-07: `npx vitest run test/config-hot-reload.test.ts test/config-hot-reload-wiring.test.ts test/config-reload-host.test.ts` — 3 files, 67/67 passed. IntelliJ-side evidence is the JUnit sources named above; their pass status is recorded in `85-04-SUMMARY.md` and `85-VERIFICATION.md`.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-07
