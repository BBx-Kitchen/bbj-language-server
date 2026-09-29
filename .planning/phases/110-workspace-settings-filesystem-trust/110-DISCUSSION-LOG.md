# Phase 110: Workspace Settings & Filesystem Trust - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-26
**Phase:** 110-workspace-settings-filesystem-trust
**Mode:** `--auto`. Every area was auto-selected, and the recommended option was taken without prompting.
**Areas discussed:** Interop fallback, configPath trust gate, USE containment, Prefix segments, Non-regular file probes, Formatter Java binary

---

## Interop fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Shared validator called inside `setConnectionConfig` (per-field fallback, default host `localhost`) | One choke point; both entry paths covered; matches what users get today | ✓ |
| Validator called at both call sites only | Leaves `setConnectionConfig` bypassable | |
| Whole-pair fallback on any invalid field | Literal reading of criterion 1; discards a valid host when only the port is bad | |

**Choice:** [auto] recommended. Numeric strings are rejected. Absent values fall back silently. Other invalid values log a warning.

## configPath trust gate

| Option | Description | Selected |
|--------|-------------|----------|
| Client helper via `inspect()` + `isTrusted`, applied to initializationOptions and the synchronize push; re-push on trust grant | Works whatever the manifest declares | ✓ |
| `restrictedConfigurations` only | Only effective if the extension runs in Restricted Mode | (added only if research shows it does) |
| Contain `configPath` to the workspace (#511's own proposal) | Contradicts the roadmap decision | |

**Choice:** [auto] recommended. There is a research gate on the extension's current Restricted Mode support, and the phase must not widen it.

## USE containment

| Option | Description | Selected |
|--------|-------------|----------|
| Lexical per-prefix containment in builder and scope (prefix candidates only) | Matches SEC-06 wording; no realpath cost | ✓ |
| Realpath-based containment | Would also reject user symlinks inside prefix dirs | |
| Also restrict document-relative/workspace candidates | Beyond the requirement | |

**Choice:** [auto] recommended. The researcher checks the corpus for absolute or `..` USE paths.

## Prefix segments

| Option | Description | Selected |
|--------|-------------|----------|
| Shared `isPathInside` (path.relative semantics, case-insensitive on Windows) | One helper for SEC-06 and SEC-07 | ✓ |
| Append separator before `startsWith` | Second ad-hoc check | |

**Choice:** [auto] recommended.

## Non-regular file probes

| Option | Description | Selected |
|--------|-------------|----------|
| `lstat` + `isFile()`, then `O_NOFOLLOW\|O_NONBLOCK` open + `fstat` re-check | Never blocks on a FIFO; narrows the swap window | ✓ |
| `lstat` pre-check only | Leaves a TOCTOU window | |

**Choice:** [auto] recommended.

## Formatter Java binary

| Option | Description | Selected |
|--------|-------------|----------|
| `bbj.formatter.javaPath`, scope `machine`, verify then spawn absolute path; empty = own PATH walk + same check | A workspace cannot pick the binary; no silent fallback | ✓ |
| Scope `window` | A workspace could set the spawned binary | |
| Empty = bare `spawn('java')` as today | Fails criterion 5 ("checked the same way") | |

**Choice:** [auto] recommended.

---

## Claude's Discretion

- Plan split and module names, message wording, and where the trust helper lives.

## Deferred Ideas

- `untrustedWorkspaces: limited` declaration (a product decision)
- The workspace-folder TODO in `isExternalDocument()`
- 3 pending todos reviewed and not folded. Each is scheduled for Phase 111, 114 or 116, and each matched only on generic keywords.
