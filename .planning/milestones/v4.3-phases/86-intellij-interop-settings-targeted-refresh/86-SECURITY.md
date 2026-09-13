---
phase: "86"
slug: "intellij-interop-settings-targeted-refresh"
status: verified
threats_open: 0
asvs_level: 1
created: "2026-09-07"
---

# Phase 86 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|----------------|
| IntelliJ plugin → language server (local stdio JSON-RPC via LSP4IJ) | A client-initiated request crosses the boundary and triggers a full Java classpath reload plus re-validation on the server side. | Refresh request/response |
| plugin → user surface | A console line and, on failure, one balloon carrying an exception's own message and an action that restarts the language server. | Exception messages |
| filesystem → plugin | `<BBj Home>/cfg/BBj.properties` is read from a user-configured path; its contents are untrusted input to a parser. | Port config string |
| parsed file content → network target | The parsed port becomes the TCP port the java-interop health probe and the language server connect to. | TCP port number |
| persisted settings file → plugin | `BbjSettings.xml` is user-writable state whose auto-detect flag and stored port are reinterpreted by a migration at load time. | Settings XML |
| filesystem → dispatch thread | The Settings dialog resolves `BBj.properties` detection while the user is interacting with it. | Port config string |
| project → published documentation | The Docusaurus site is public; text describes where a configuration value is read from. | Config file path/key names |
| planning directory → future phases | The QA checklist and the closed todo are the record a later UAT run and a later audit read. | QA/audit records |
| IDE plugin → spawned language-server process | The plugin destroys and re-creates an OS process whose stdin is shared with LSP4IJ's asynchronous message writer. | Process lifecycle signals |
| LSP dispatch thread → EDT → pooled Alarm thread | Server status crosses two thread hops before it reaches the restart decision. | Server status state |

---

## Threat Register

| Threat ID | Plan | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|------|----------|-----------|----------|-------------|------------|--------|
| T-86-01 | 86-01 | Denial of Service | repeated Refresh Java Classes calls each starting a full server-side classpath reload | high | mitigate | Per-project single-flight guard + 60s bound in a `finally` — `RefreshInFlightGuardTest` | closed |
| T-86-02 | 86-01 | Denial of Service | blocking proxy lookup/request on the dispatch thread freezing the IDE | high | mitigate | Runs in `Task.Backgroundable`; off-dispatch-thread assertion pinned by source guard | closed |
| T-86-03 | 86-01 | Tampering | unexpected boolean / version-skewed response shape crossing the LSP4IJ boundary | medium | mitigate | Response type unwidened; `false` classified as `DECLINED`, not success — `JavaClassesRefreshFlowTest` | closed |
| T-86-04 | 86-01 | Information Disclosure | raw exception message rendered into the failure balloon body | low | accept | Message originates in the plugin's own JVM / local language server, already visible in the console; no remote/multi-tenant surface | closed |
| T-86-05 | 86-01 | Elevation of Privilege | balloon's restart action invoked without user intent | low | mitigate | Restart reachable only from a `NotificationAction` body, fenced to one occurrence by source guard | closed |
| T-86-06 | 86-02 | Denial of Service | malformed/hostile `BBj.properties` throwing out of the parser | high | mitigate | `readFrom` catches `IOException`/`RuntimeException`; no throwing path in `parseAddrValue` — malformed matrix in `BbjInteropPortDetectorTest` | closed |
| T-86-07 | 86-02 | Tampering | out-of-range/non-numeric port carried into a connection attempt | high | mitigate | Parser validates 1-65535; `sanitizePort` re-validates persisted explicit port | closed |
| T-86-08 | 86-02 | Spoofing | attacker who can write `BBj.properties` redirecting the java-interop connection | medium | accept | Requires write access to the user's own BBj install (already implies runtime/classpath control); host never detected, stays localhost | closed |
| T-86-09 | 86-02 | Denial of Service | repeated properties reads on every keystroke / 5s health tick | medium | mitigate | Stat-keyed cache, at most one read per observed stat change — `BbjInteropPortCacheTest` | closed |
| T-86-10 | 86-02 | Information Disclosure | file content reaching the settings dialog verbatim | low | mitigate | Only a parsed integer + fixed plugin strings reach the dialog | closed |
| T-86-11 | 86-03 | Tampering | hand-edited/corrupt `BbjSettings.xml` carrying an out-of-range explicit port | high | mitigate | Routed through `InteropPortSettings.sanitizePort`; invalid saved port treated as no signal | closed |
| T-86-12 | 86-03 | Denial of Service | filesystem work on the dispatch thread freezing the Settings dialog | high | mitigate | Detection resolved once per dialog open via stat-keyed cache; no cache/service ref held by component (source guard) | closed |
| T-86-13 | 86-03 | Tampering | silent overwrite of user's explicitly chosen port by auto-detection | high | mitigate | `portToPersist` returns stored value whenever checkbox is on; flag (not value) records the choice | closed |
| T-86-14 | 86-03 | Spoofing | writable `BBj.properties` redirecting the java-interop connection | medium | accept | Same rationale as T-86-08; host never detected | closed |
| T-86-15 | 86-03 | Information Disclosure | detected file content shown in the Settings dialog | low | mitigate | Component receives a `PortLookup` value + precomputed integer, never file text | closed |
| T-86-16 | 86-03 | Denial of Service | Settings Apply on auto-detect-flag-only change triggering unnecessary restart | low | accept | Existing coalesced-restart behavior is correct: init options are the only channel carrying the port; restart-only-when-relevant recorded as a deferred idea | closed |
| T-86-17 | 86-04 | Information Disclosure | published documentation naming a config file path and key | low | accept | `BBj.properties` / `com.basis.languageServer.addr` are part of BBjServices' own documented surface; no credential/token named | closed |
| T-86-18 | 86-04 | Repudiation | a hand check recorded as passed without exact steps, leaving evidence unauditable | high | mitigate | Numbered steps + falsifiable observable results per QA row | closed |
| T-86-19 | 86-04 | Tampering | existing QA row silently reworded/renumbered while appending | medium | mitigate | Verify command asserts rows 14/15 still present under original numbering/wording | closed |
| T-86-20 (86-04) | 86-04 | Tampering | closing a todo that was not actually delivered | medium | mitigate | Closure note names delivering phase/decision/plan; verify asserts no production tree modified by this doc-only plan | closed |
| T-86-20 (86-05) | 86-05 | Denial of Service | `BbjServerService.doRestart` overlapping stop/start against one `LanguageServerWrapper` | high | mitigate | Bounded wait makes teardown complete before start; `RestartGate` prevents concurrent restart cycles — removes the upstream writer-race trigger | closed |
| T-86-21 | 86-05 | Denial of Service | `ExpectedStopGuard` token swallowing a genuine crash, leaving the server down | medium | mitigate | One-shot token, 30s time-box, armed only when server observed live — 3 independent limits, each tested (`ExpectedStopGuardTest`) | closed |
| T-86-22 | 86-05 | Denial of Service | `RestartGate` dropping a user-requested restart while one is in flight | medium | mitigate | Window bounded to 5s stop-wait + start; drop reported to caller (boolean) and console — `RestartGateTest` | closed |
| T-86-23 | 86-05 | Denial of Service | `BoundedWait.SLEEPING` blocking a UI thread | high | mitigate | `doRestart` reachable only via gate on `AlarmScheduler`'s pooled thread (pinned by source guard); wait capped at 5s, returns on interrupt | closed |
| T-86-24 | 86-05 | Information Disclosure | new console lines naming restart state | low | accept | Lines name only server lifecycle state; no path/token/credential/user content | closed |
| T-86-25 | 86-05 | Tampering | a later refactor silently removing the expected-stop branch or the wait, reintroducing the race | medium | mitigate | Source guards pin the arm/stop/wait/start sequence, the expected-verdict constant, and the single `BoundedWait.until(` call site | closed |
| T-86-SC | all | Tampering | npm/pip/cargo installs | low | accept | No plan in this phase adds a package-manager install task or new dependency; Gradle/LSP4IJ pins unchanged across all 5 plans | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` (high) count toward `threats_open`*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

Every `mitigate` disposition above is backed by a named test file confirmed present in `bbj-intellij/src/test/` and recorded `status: pass` in the corresponding `*-SUMMARY.md` coverage block (or, for 86-04's doc/process threats, by the plan's own `<automated>` verify commands). `register_authored_at_plan_time: true` for all 5 plans and `asvs_level: 1` — per the Nyquist/security short-circuit rule this audit did not require spawning `gsd-security-auditor`.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|--------------|------|
| AR-86-1 | T-86-04 | Raw exception message in balloon — local-only surface, no secrets | Plan 86-01 author | 2026-09-07 |
| AR-86-2 | T-86-08, T-86-14 | `BBj.properties` write access already implies BBj runtime/classpath control | Plans 86-02/86-03 author | 2026-09-07 |
| AR-86-3 | T-86-16 | Coalesced restart on auto-detect-flag-only Apply is correct given init-option-only port channel | Plan 86-03 author | 2026-09-07 |
| AR-86-4 | T-86-17 | Documenting `BBj.properties` / `com.basis.languageServer.addr` discloses nothing beyond BBjServices' own docs | Plan 86-04 author | 2026-09-07 |
| AR-86-5 | T-86-24 | New console lines name only lifecycle state, no sensitive content | Plan 86-05 author | 2026-09-07 |
| AR-86-6 | T-86-SC | No package-manager install or new dependency added by any plan in this phase | All plan authors | 2026-09-07 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|----------------|--------|------|--------|
| 2026-09-07 | 27 | 27 | 0 | /gsd-secure-phase (orchestrator, short-circuit path) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-07
