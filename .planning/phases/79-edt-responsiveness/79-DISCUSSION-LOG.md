# Phase 79: EDT Responsiveness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-04
**Phase:** 79-edt-responsiveness
**Areas discussed:** Regression-test approach, Restart funnel semantics, Node-version cache & debounce, Download guard

---

## Pending todos (cross-reference)

| Option | Description | Selected |
|--------|-------------|----------|
| Fold neither | EM Config `--` sentinel is a run-action arg bug; getAllClassNames drift lives in bbj-vscode | ✓ |
| Fold: EM Config sentinel | Strip the sentinel in `getConfigPathArg` / `Commands.cjs` while touching the run pipeline | |
| Fold: live-interop test drift | Update the two vitest suites in this phase | |

**User's choice:** Fold neither. Both recorded as reviewed in CONTEXT.md `<deferred>`.

---

## Regression-test approach

### Test shape

| Option | Description | Selected |
|--------|-------------|----------|
| Seams + behavioural JUnit | Plain-Java units with injectable scheduler/thread probe, behavioural tests, one source-guard per site | ✓ |
| Source-guard tests only | Assert on source text; cannot simulate keystrokes or two triggers | |
| IntelliJ test framework | `testFramework(TestFrameworkType.Platform)`; conflicts with REQUIREMENTS.md Out of Scope | |

**User's choice:** Seams + behavioural JUnit (recommended).

### EDT assertion for #506

| Option | Description | Selected |
|--------|-------------|----------|
| Runtime assertion + source-guard | `assertIsNonDispatchThread()` at the top of both methods, source-guard checks assertion and wrapper | ✓ |
| Injectable thread probe only | Both methods consult a `ThreadProbe`; no production change | |
| Source-guard only | Assert the `executeOnPooledThread` wrapper exists | |

**User's choice:** Runtime assertion + source-guard (recommended).

### Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Fake scheduler seam | Small `Scheduler` interface; production adapts `Alarm`; tests advance manually | ✓ |
| Real Alarm with waits | Real `com.intellij.util.Alarm` with timeouts; needs platform on classpath | |
| Don't test timing | Count semantics only; delay values via source-guard | |

**User's choice:** Fake scheduler seam (recommended). Then "Next area".

---

## Restart funnel semantics

### Overlap behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Coalesce via restartAlarm | One `requestRestart()`: `cancelAllRequests` + `addRequest`; bursts collapse to one restart | ✓ |
| In-flight flag, drop overlaps | `AtomicBoolean restarting`; later callers return; needs clearing on LSP4IJ status callbacks | |
| Both: coalesce then guard | Debounce plus in-flight flag | |

**User's choice:** Coalesce via restartAlarm (recommended).

### Manual restart latency

| Option | Description | Selected |
|--------|-------------|----------|
| Same path, short delay | All triggers through the guard; manual ones use ~0 ms | ✓ |
| Manual immediate, auto debounced | Two entry points | |
| Uniform 500 ms for all | Every trigger waits `RESTART_DEBOUNCE_MS` | |

**User's choice:** Same path, short delay (recommended).

### Seventh trigger (Node download completion)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, route it too | Direct `restart()` becomes private; source-guard asserts zero external call sites | ✓ |
| Leave it as is | Stay literally within #539's list; note for Phase 83 | |

**User's choice:** Yes, route it too (recommended). Then "Next area".

---

## Node-version cache & debounce

### Cache key

| Option | Description | Selected |
|--------|-------------|----------|
| Path + file mtime/size | Re-spawn only when the setting changes or the binary is replaced | ✓ |
| Path only | Literal EDT-03 wording; stale after in-place upgrade | |
| Path + TTL | Bounded staleness; can still double-spawn across a boundary | |

**User's choice:** Path + file mtime/size (recommended).

### Cache home

| Option | Description | Selected |
|--------|-------------|----------|
| Static memo in a new `BbjNodeVersionCache` | Plain class beside `BbjNodeDetector`; `ConcurrentHashMap`; package-private `clear()` | ✓ |
| Application-level service | `@Service(APP)` with `Disposable`; needs platform in tests | |
| Fold into `BbjNodeDetector` | Fewest files; mixes state into the utility | |

**User's choice:** Static memo in a new `BbjNodeVersionCache` (recommended).

### Pending UI in the Settings dialog

| Option | Description | Selected |
|--------|-------------|----------|
| "Checking…" placeholder | Label shows "Checking Node.js version…", combo disabled; stale results discarded | ✓ |
| Keep last result | Previous text stays until result arrives | |
| Blank until resolved | Clear on keystroke, fill on result | |

**User's choice:** "Checking…" placeholder (recommended). Then "Next area".

---

## Download guard

### Guard mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| In-memory `AtomicBoolean` CAS, drop the persisted flag | `compareAndSet` in a `DownloadGuard` seam; delete `DOWNLOAD_IN_PROGRESS_KEY` | ✓ |
| CAS + keep persisted flag as a hint | Two sources of truth; stale-after-crash remains | |
| Synchronized section | `synchronized(BbjNodeDownloader.class)`; harder to unit-test | |

**User's choice:** In-memory `AtomicBoolean` CAS, drop the persisted flag (recommended).

### Losing caller

| Option | Description | Selected |
|--------|-------------|----------|
| Balloon + attach its callback | Keep the "already in progress" balloon; loser's `onComplete` runs when the single download finishes | ✓ |
| Balloon only (current) | Loser's callback never fires | |
| Silent no-op | No feedback | |

**User's choice:** Balloon + attach its callback (recommended).

### Plan split

| Option | Description | Selected |
|--------|-------------|----------|
| Per seam, tests first | Plan 1 restart funnel (#539, #513); Plan 2 cache + debounce (#541, #543); Plan 3 download guard + #506 (#537, #506) | ✓ |
| One plan per requirement | Six plans; shared files block parallelism anyway | |
| Planner decides | Leave to the planner | |

**User's choice:** Per seam, tests first (recommended). Then "I'm ready for context".

---

## Claude's Discretion

- Seam names, packages, and placement.
- Settings debounce interval (300 ms suggested) and the exact near-zero delay for manual restarts.
- Test file placement (`lsp/` package vs. mirrored packages).
- Source-guard matching style.
- Whether the #506 assertion sits at the single `buildCommandLine` call site or in each subclass.

## Deferred Ideas

- Broader Node download/cache and LSP4IJ canary coverage — Phase 83.
- General async/threading abstraction — Out of Scope.
- Promoting `BbjNodeVersionCache` to an application service — only if a third consumer needs lifecycle hooks.
