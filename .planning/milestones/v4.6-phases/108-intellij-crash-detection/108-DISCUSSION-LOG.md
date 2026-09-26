# Phase 108: IntelliJ Crash Detection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-25
**Phase:** 108-intellij-crash-detection
**Areas discussed:** Crash signal source, Crash response policy, What the user sees, UAT & evidence

Todos folded: lost-connection-invisible (LIFE-01), stale-previous-status (LIFE-02). Not folded:
Phase 97 review follow-ups, linking.test interop failures.

---

## Crash signal source

| Option | Description | Selected |
|--------|-------------|----------|
| LSP4IJ unexpected-stop hook | Override addUnexpectedServerStopHandler in BbjLanguageServer; rely on LSP4IJ's "terminated without stop()" check | ✓ |
| Own process listener + stop flag | Override stop(), attach own ProcessListener to getProcessHandler() | |
| You decide | Research picks | |

| Option | Description | Selected |
|--------|-------------|----------|
| Process exit only | stdio: dropped connection = process exit; hung process out of scope | ✓ |
| Also stream EOF with live process | Second signal from LSP4J listener end | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Exit signal decides, guard filters | Crash only from the hook; ExpectedStopGuard.arm() filters own restarts; status feed for display/logging | ✓ |
| Combine exit + status | Require hook + subsequent `stopped` | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse the feed, rewrite guards | Re-apply bb0a49f0 + cb3ce7f8; rewrite a2680319's guards | ✓ |
| Reuse all three as-is | Cherry-pick all | |
| Fresh implementation | Old commits as reference only | |

**Notes:** Before asking, the LSP4IJ 0.21.0 bytecode was inspected: `LSPProcessListener.processTerminated`
runs unexpected-stop handlers only when `isStopped()` is false; the wrapper registers its handler on every start.

---

## Crash response policy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep: restart once, stop on 2nd | Existing policy | ✓ |
| No auto-restart, LSP4IJ retries | Log + status only | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Count within window, ignore started | Two crashes in 30 s gives up; manual/settings restarts still reset | ✓ |
| Reset once stable for N seconds | | |
| Keep reset on started | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep arm() as a belt | Covers process dying during our own stop | ✓ |
| Drop the guard | | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Let doRestart's stop+start clear it | Research confirms serverError/retry counter reset | ✓ |
| You decide | | |

**Notes:** Bytecode shows LSP4IJ's unexpected-stop handler sets serverError, stops, and shows its own
notification without restarting. Claude flagged that `doRestart()` calls `clearCrashState()`, which would
defeat the window counter for crash auto-restarts; recorded as a plan requirement.

---

## What the user sees

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct 'crashed' label while crashed | Widget label/icon/tooltip | ✓ |
| Status unchanged, banner + log only | | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Console + idea.log only | First crash quiet; banner/balloon on give-up | ✓ |
| Banner until restarted | Current behaviour | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Accept the duplicate | Leave LSP4IJ's notification | ✓ |
| Research whether it can be suppressed cleanly | | |

| Option | Description | Selected |
|--------|-------------|----------|
| WARN with pid + exit code if available | Plus give-up line | ✓ |
| Plain WARN, no details | | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes: widget always, banner on give-up | Widget reflects every crash; banner/balloon only on give-up | ✓ |
| Widget only on give-up too | | |

---

## UAT & evidence

| Option | Description | Selected |
|--------|-------------|----------|
| Early probe build, then implement | Plan 1 = hook + logging only; user pastes real idea.log | ✓ |
| Implement fully, verify at final UAT | | |

| Option (multi-select) | Description | Selected |
|--------|-------------|----------|
| Second kill within 30 s → gives up | | ✓ |
| Manual restart action | | ✓ |
| Project close | | ✓ |
| Refresh Java Classes / config reload | | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| kill -9 <pid> | SIGKILL | ✓ |
| Both kill -9 and plain kill | | |

| Option | Description | Selected |
|--------|-------------|----------|
| macOS only; idea.log grep per scenario | Observed/derived marking | ✓ |
| macOS + Windows | | |

---

## Claude's Discretion

- Widget crashed-state wording/icon; ExpectedStopGuard API reshape; how the crash auto-restart
  skips clearCrashState(); idle-shutdown coverage via unit tests unless the probe says otherwise.

## Deferred Ideas

- Hung-process / stream-EOF heartbeat detection.
- Suppressing LSP4IJ's duplicate crash notification.
- Windows kill-scenario UAT.
