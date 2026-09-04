---
phase: "79"
slug: "edt-responsiveness"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
register_authored_at_plan_time: true
created: "2026-09-04"
---

# Phase 79 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Built from the `<threat_model>` blocks of 79-01, 79-02 and 79-03 PLAN.md (State B). ASVS level 1: mitigations verified at grep depth against main @ 9cf77e3 (post code-review fixes).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| IDE UI actions → language-server process lifecycle | Restart action, status-bar widgets, notification actions and LSP4IJ status callbacks cross into `stop`/`start` of an external process | Control signals only |
| LSP4IJ status callback → crash-recovery state machine | Crash events arrive on an arbitrary thread and drive automatic restarts | Process status, timing |
| Settings field text (user-controlled) → subprocess spawn | The configured Node.js path reaches `GeneralCommandLine(nodePath, "--version")` | User-entered filesystem path |
| Settings field text → cache key | Path plus a stat of the file it names becomes the memo key | Path, mtime, length |
| Background lookup thread → EDT | Off-EDT results are applied to Swing components through `invokeLater` | Version string, classpath entry list |
| Two IDE windows / two threads → one shared Node install directory | Concurrent `downloadNodeAsync` callers write the same plugins-path target | Downloaded archive bytes |
| Notification / editor-banner click → background download task | User clicks cross into HTTP download plus archive extraction | Remote archive |
| Action invocation thread → blocking network I/O | EM token validation (≤10 s) and login (≤15 s) must never run on the EDT | Credentials (handled by pre-existing v4.1 secret-argv protections) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-79-01 | Denial of Service | `BbjServerService.updateStatus()` crash branch | medium | mitigate | `requestRestart(CRASH_RESTART_DELAY_MS)` schedules the 1000 ms delay on the pooled Alarm; `Thread.sleep` count in `BbjServerService.java` is 0 (`BbjServerServiceRestartSourceGuardTest`) | closed |
| T-79-02 | Denial of Service | `RestartGate.request()` | medium | mitigate | `request(long)` is `synchronized` (review fix WR-01) and does `cancelAll()` then `schedule()`; `RestartGateTest` (8) proves one restart for overlapping and 8-thread concurrent requests | closed |
| T-79-03 | Tampering | language-server lifecycle reachable from many call sites | medium | mitigate | `public void restart()` removed, `private void doRestart()` present; zero `.restart()` sites outside `BbjServerService`; source guard (9 tests incl. settings-apply site, WR-05) fails the build if one returns | closed |
| T-79-04 | Denial of Service | `AlarmScheduler` Alarm ownership | low | mitigate | `AlarmScheduler(@NotNull Disposable parent)` passes `parent` to `new Alarm(POOLED_THREAD, parent)`; `BbjServerService` constructs it with `this` and `Disposer.register(project, this)` | closed |
| T-79-05 | Repudiation | crash-recovery console log | low | accept | `logToConsole` messages unchanged, no user-identifying data; local tool window, not an audit surface | closed |
| T-79-11 | Tampering | `BbjNodeVersionCache` key (TOCTOU) | medium | mitigate | Stamp is `file.lastModified() + ":" + file.length()`; `BbjNodeVersionCacheTest` Test 2 proves re-spawn on stat change | closed |
| T-79-12 | Elevation of Privilege | `node --version` spawn from user-configured path | medium | accept | Executing the configured interpreter is the feature; same user who runs the IDE; plan strictly reduces spawn count; argv construction unchanged and covered by v4.1 exec hardening | closed |
| T-79-13 | Denial of Service | unbounded cache growth | low | mitigate | `cache.compute(nodePath, ...)` replaces per path (WR-02 also closed the check-then-act race); `BbjNodeVersionCacheTest` Test 7 pins `size()` at 1 across ten stat changes | closed |
| T-79-14 | Denial of Service | keystroke-driven subprocess storm | high | mitigate | `KeystrokeDebouncer` calls `scheduler.cancel(previous)` before scheduling; never `cancelAll()`; `KeystrokeDebouncerTest` Tests 1-2 prove N keystrokes → 1 lookup | closed |
| T-79-15 | Information Disclosure | configured path echoed into version label / validation messages | low | accept | The user's own input rendered into their own settings dialog; strings byte-identical to before | closed |
| T-79-16 | Denial of Service | debounce Alarm without a `Disposable` owner | medium | mitigate | `BbjSettingsComponent` has zero `new Alarm(`; `new AlarmScheduler(parentDisposable)` at line 63; `BbjSettingsConfigurable.disposeUIResources()` disposes it; source guard forbids a bare Alarm | closed |
| T-79-21 | Tampering | concurrent writes to the shared node executable target | high | mitigate | `DownloadGuard.SESSION.tryAcquire(onComplete)` at line 79 precedes `.queue()` at line 100; `DownloadGuardTest` Test 2 proves exactly one of eight concurrent callers wins | closed |
| T-79-22 | Denial of Service | never-released in-progress flag wedging future downloads | medium | mitigate | In-memory guard released in the background task's `finally` (line 94-95) on success and failure paths; `DOWNLOAD_IN_PROGRESS_KEY` and `PropertiesComponent` count 0 (`BbjNodeDownloaderSourceGuardTest#thePersistedInProgressFlagIsGone`) | closed |
| T-79-23 | Tampering | two separate IDE processes sharing one plugins directory | low | accept | In-JVM guard cannot span processes; a file lock is out of scope this milestone (research PITFALLS.md Pitfall 3); recorded in 79-03-SUMMARY.md | closed |
| T-79-24 | Denial of Service | EDT blocked on EM token validation or login | high | mitigate | `executeOnPooledThread` wrappers intact in both actions; `assertIsNonDispatchThread()` at `BbjRunActionBase:63` and `BbjEMLoginAction:61`; `validateBeforeRun` also moved into the pooled lambda (CR-01); `OffEdtDispatchSourceGuardTest` (5) fails if either is removed; confirmed live in 79-UAT.md test 2 | closed |
| T-79-25 | Information Disclosure | the assertion's error report in `idea.log` | low | accept | Stack trace of plugin frames only; no token, credential or path value added; v4.1 secret-argv protections untouched | closed |
| T-79-26 | Spoofing | downloaded archive authenticity | medium | transfer | Pre-existing `NodeArchiveVerifier.verify(...)` (line 140) against pinned digests and `NodeInstallIntegrity.SESSION.record(...)` (line 221); guarded by the seven pre-existing `BbjNodeDownloaderSourceGuardTest` assertions, untouched by this phase | closed |
| T-79-SC | Tampering | npm/pip/cargo installs | low | accept | No plan added a dependency or modified `bbj-intellij/build.gradle.kts`; no package-manager install task exists | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

Note: T-79-SC appears in all three plan registers with identical wording and is recorded once.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-79-01 | T-79-05 | Console log is a local diagnostic surface, not an audit trail; contents unchanged | planner (79-01-PLAN.md) | 2026-09-04 |
| R-79-02 | T-79-12 | Running the user's configured Node interpreter is the feature's purpose; surface strictly reduced | planner (79-02-PLAN.md) | 2026-09-04 |
| R-79-03 | T-79-15 | User's own path rendered back to the same user; message strings unchanged | planner (79-02-PLAN.md) | 2026-09-04 |
| R-79-04 | T-79-23 | Cross-process download race needs a file lock; out of scope for v4.2 (PITFALLS.md Pitfall 3) | planner (79-03-PLAN.md), recorded in 79-03-SUMMARY.md | 2026-09-04 |
| R-79-05 | T-79-25 | Assertion report contains plugin stack frames only, no secrets | planner (79-03-PLAN.md) | 2026-09-04 |
| R-79-06 | T-79-SC | No dependency or build-script change in this phase | planner (all three plans) | 2026-09-04 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-04 | 18 | 18 | 0 | /gsd-secure-phase 79 (orchestrator, L1 grep-depth short-circuit) |

Observation carried from 79-REVIEW.md, out of scope for this register (informational finding IN-03, not a phase-79 threat): `BbjNodeDownloader.deleteDirectory` follows symlinks during recursive cleanup. Left for a future pass per `fix_scope: critical_warning`.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-04
