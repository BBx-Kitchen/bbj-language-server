# Phase 84: Config Path Resolution & Discoverability Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-06
**Phase:** 84-config-path-resolution-discoverability-foundation
**Areas discussed:** Resolved-path source of truth, Editor association mechanics, Consumer audit rules, Bad paths & setting changes

---

## Pre-discussion: folded todo

| Option | Description | Selected |
|--------|-------------|----------|
| Fold it in | Both run paths are consumers of the config path; sentinel handling belongs in the shared resolution this phase builds | ✓ |
| Leave it pending | Keep the todo separate | |

**User's choice:** Fold it in (the EM Config `--` sentinel todo).

---

## Resolved-path source of truth

### How should the hosts learn the resolved config path?

| Option | Description | Selected |
|--------|-------------|----------|
| Request + notification | `bbj/resolvedConfigPath` request plus a server-pushed notification after initialize and on change; hosts cache the value | ✓ |
| Request only | Hosts call the request whenever needed; round trip per consumer | |
| Notification only | Server pushes; hosts only read their cache | |

**User's choice:** Request + notification.

### What do hosts use before the server has answered?

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit setting only | Act on the explicit setting when set, nothing otherwise; the fallback file is always `config.bbx`, already statically associated | ✓ |
| Persisted cache of last answer | Store the last resolved path in workspace/project state | |
| Mirrored fallback with parity test | Hosts keep a copy of the fallback logic guarded by a cross-host test | |

**User's choice:** Explicit setting only.

### What happens to the existing host-side run fallbacks?

| Option | Description | Selected |
|--------|-------------|----------|
| Use the server's cached value | Run commands read the cached resolved path; clear error if absent | ✓ |
| Ask the server on each run | Synchronous request before every launch | |
| Keep host fallback for run only | Leave the two fallbacks as a documented exception | |

**User's choice:** Use the server's cached value.

### What form does the shared resolved path take?

| Option | Description | Selected |
|--------|-------------|----------|
| Canonical absolute path | One string: absolute, symlinks resolved, separators normalized | ✓ |
| Raw and canonical | Both the setting text and the canonical form | |
| Raw only | Setting text or joined default; hosts canonicalize | |

**User's choice:** Canonical absolute path.

---

## Editor association mechanics

### VS Code: which events (re)apply the bbx-config language?

| Option | Description | Selected |
|--------|-------------|----------|
| Every classification trigger | Open documents at activation, onDidOpenTextDocument, onDidChangeConfiguration (release old, associate new); reopen/revert regression test | ✓ |
| Open and activation only | No reaction to setting changes until next open | |

**User's choice:** Every classification trigger.

### IntelliJ: what level of treatment for a custom-named config file?

| Option | Description | Selected |
|--------|-------------|----------|
| File type + highlighting + predicate | Plugin-owned config file type via file-type override, bbx TextMate grammar, icon, `isConfigFile` predicate for Phase 87 | ✓ |
| Highlighting only | Only the TextMate grammar; no file type, no predicate | |

**User's choice:** File type + highlighting + predicate.

### Should config files reach the language server?

| Option | Description | Selected |
|--------|-------------|----------|
| Never, on both hosts | New IntelliJ file type unmapped; `config.bbx` moves to it and stops being parsed as BBj source | ✓ |
| Only the custom-named file stays out | Keep `config.bbx` on the BBj file type | |
| Send them; server ignores by language id | Route under a `bbx-config` language id and skip server-side | |

**User's choice:** Never, on both hosts.

### How should the editor handle the default config.bbx when a custom path is configured?

| Option | Description | Selected |
|--------|-------------|----------|
| Highlight, and warn in tooling | Keep highlighting; composer and Show-config name the active file | ✓ |
| Highlight, no hint | Leave as today | |
| Hint via a non-blocking editor banner | Editor-top info bar naming the active file, plus tooling messages | |

**User's choice:** Highlight, and warn in tooling.

---

## Consumer audit rules

### How should the compile config-file setting relate to bbj.configPath?

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit wins, else resolved path | Explicit `typeChecking.configFile` wins; otherwise, with type checking on and no prefix directories, `-c` gets the resolved path | ✓ |
| Leave compile untouched | Compile never consults `bbj.configPath` | |
| Retire the compile setting | Deprecate in favor of `bbj.configPath` | |

**User's choice:** Explicit wins, else resolved path.

### What should the Show-config command open?

| Option | Description | Selected |
|--------|-------------|----------|
| The resolved file | Open the resolved path; error naming it if missing; rename the command title | ✓ |
| Resolved, fall back to default | Silently open the home default when missing | |

**User's choice:** The resolved file.

### Which path forms should the setting accept?

| Option | Description | Selected |
|--------|-------------|----------|
| Absolute, plus ~ expansion | Absolute only, `~` expanded in the resolver; relative rejected with a message | ✓ |
| Absolute and workspace-relative | Also resolve against the first workspace folder / project base | |
| Absolute only, strictly | No expansion at all | |

**User's choice:** Absolute, plus ~ expansion.

### Where should the EM Config '--' sentinel be neutralized?

| Option | Description | Selected |
|--------|-------------|----------|
| Central resolver + run-arg guards | Resolver treats `--`/blank as unset; run-arg builders also refuse `-c--` | ✓ |
| Run-arg guards only | Only fix the two run-arg sites | |

**User's choice:** Central resolver + run-arg guards.

---

## Bad paths & setting changes

### Configured file missing or unreadable: what should the user see?

| Option | Description | Selected |
|--------|-------------|----------|
| One-time warning per path | Non-modal warning in both IDEs naming the path, once per distinct path per session, plus log | ✓ |
| Log only | Today's behavior | |
| Persistent status indicator | Status-bar item while unreadable | |

**User's choice:** One-time warning per path.

### When bbj.configPath changes at runtime, how far should Phase 84 go?

| Option | Description | Selected |
|--------|-------------|----------|
| Re-resolve and re-associate only | Server recomputes and pushes; hosts update cache and association; PREFIX reload stays with Phase 85 | ✓ |
| Also reload PREFIX now | Pull Phase 85's reload forward | |

**User's choice:** Re-resolve and re-associate only.

### Should the IntelliJ Settings dialog validate the config path field?

| Option | Description | Selected |
|--------|-------------|----------|
| Warn inline, allow Apply | Inline warning for non-absolute or missing file; Apply still allowed | ✓ |
| Block Apply on invalid path | Refuse to apply | |
| No validation | Rely on the runtime warning | |

**User's choice:** Warn inline, allow Apply.

### If the configured path carries a BBj source extension, which association wins?

| Option | Description | Selected |
|--------|-------------|----------|
| Configured path always wins | Explicit setting outranks extension-based association; file kept out of the server | ✓ |
| Source extension wins | Source-extension files stay BBj source | |

**User's choice:** Configured path always wins.

---

## Claude's Discretion

- Request/notification method and payload field names within the `bbj/…` convention.
- Placement of the IntelliJ `isConfigFile` predicate and the VS Code equivalent.
- Wording of the warning, inactive-config hint, and renamed command title.
- Keying/reset of the once-per-path warning (session-scoped).

## Deferred Ideas

- Workspace-relative config paths (rejected for this phase; settings are window/application scoped).
- Persistent status-bar indicator for an unreadable config file (Phase 85 owns the config status signal).
- Immediate PREFIX/USE re-read on setting change (Phase 85, #486).
