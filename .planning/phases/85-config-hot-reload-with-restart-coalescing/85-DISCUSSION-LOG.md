# Phase 85: Config Hot-Reload With Restart Coalescing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-06
**Phase:** 85-config-hot-reload-with-restart-coalescing
**Mode:** `--auto` — every question resolved with the recommended option, no AskUserQuestion prompts
**Areas discussed:** Detection ownership, Reload semantics, Self-write suppression, Debounce and coalescing, Signal UX, Setting-change path

---

## Detection ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Server watches, hosts restart | Language server runs a non-recursive `fs.watch` on the canonical config directory, filters by basename, pushes a `bbj/…` reload-required notification; each host only executes the restart through its choke point | ✓ |
| Each host watches | VS Code `RelativePattern` watcher + IntelliJ `AsyncFileListener`/watch root, as the research proposed; two implementations, each with its own out-of-workspace and refresh caveats | |

**Auto-selected:** Server watches, hosts restart (recommended default)
**Notes:** `[auto] Detection ownership — Q: "Who watches the resolved config file?" → Selected: "Server watches, hosts restart"`. The research's host-side proposal was not a locked decision; the server already owns the resolved path, knows the consumed lines, and knows build state, and IntelliJ VFS events for out-of-content files are unreliable without a watch root plus refresh.

---

## Reload semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Relevance gate on consumed directives | Restart only when the config content the server reads (today: PREFIX) changed, compared as a normalized hash against the running snapshot | ✓ |
| Any byte change | Any file event after debounce restarts the server | |
| In-process re-evaluation | Re-read PREFIX/USE and rebuild in place instead of restarting | (rejected by #486; not offered) |

**Auto-selected:** Relevance gate (recommended default)
**Notes:** `[auto] Reload semantics — Q: "What counts as a change?" → Selected: "Relevance gate on consumed directives"`. Restart-not-reevaluate was treated as locked by the issue and roadmap title.

---

## Self-write suppression

| Option | Description | Selected |
|--------|-------------|----------|
| Structural, via the relevance gate | SETOPTS composer writes never touch PREFIX, so they never produce a reload; proven by a SETOPTS-only vs PREFIX regression pair | ✓ |
| Timestamp/hash window keyed to the composer write | Record the composer's own write and skip the next matching watcher event | |

**Auto-selected:** Structural via relevance gate (recommended default)
**Notes:** `[auto] Self-write suppression — Q: "How are composer writes absorbed?" → Selected: "Structural, via the relevance gate"`. The window was rejected because VS Code's SETOPTS composer edits the buffer with `WorkspaceEdit` and the disk write happens at the user's later save, so no reliable write-time marker exists.

---

## Debounce and coalescing

| Option | Description | Selected |
|--------|-------------|----------|
| Server debounce + quiescence + host choke points | ≥1000 ms trailing-edge debounce on file events, wait for no in-flight build / CPL timers (bounded ≈5 s), then notify; VS Code gains a `RestartGate`-style `requestRestart`, IntelliJ reuses `requestRestart(500)` | ✓ |
| Host-side debounce only | Each host debounces its own events and restarts; no view of validation state | |

**Auto-selected:** Server debounce + quiescence + host choke points (recommended default)
**Notes:** `[auto] Debounce and coalescing — Q: "How is a mid-validation restart prevented?" → Selected: "Server debounce + quiescence + host choke points"`.

---

## Signal UX

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-restart + status bar | Transient status-bar item (VS Code) / reason on the existing widget (IntelliJ), one log line, no prompt | ✓ |
| Prompt "config changed — reload?" | The optional prompt floated in #486 | |

**Auto-selected:** Auto-restart + status bar (recommended default)
**Notes:** `[auto] Signal UX — Q: "Auto-restart or prompt?" → Selected: "Auto-restart + status bar"`. Consistent with PROJECT.md's BBjCPL "status bar over balloons" decision; the relevance gate and quiescence wait remove the mid-edit surprise the prompt was meant to avoid.

---

## Setting-change path

| Option | Description | Selected |
|--------|-------------|----------|
| Same gate as a file edit | Re-arm the watch on the new path, compare the new file's PREFIX to the snapshot, restart only if different | ✓ |
| Always restart on a path change | Any `bbj.configPath` change restarts regardless of content | |

**Auto-selected:** Same gate as a file edit (recommended default)
**Notes:** `[auto] Setting-change path — Q: "What happens when bbj.configPath changes at runtime?" → Selected: "Same gate as a file edit"`. Closes Phase 84 D-14's open hook.

---

## Claude's Discretion

- Notification name/payload fields; debounce and quiescence constants within the stated bounds; watcher re-arm mechanics and a possible `fs.watchFile` polling fallback; status-bar wording/icons; hash normalization rules.

## Deferred Ideas

- Opt-out setting for config auto-reload; in-process reload; dialog-aware restart deferral; watching `project.properties`; reuse of the VS Code choke point by Phase 86's interop refresh.

## Todos

- None folded. All five pending todos matched on the keyword `bbj` only; the EM-sentinel todo is already delivered by Phase 84 D-12 and should be closed. See CONTEXT.md "Reviewed Todos".
