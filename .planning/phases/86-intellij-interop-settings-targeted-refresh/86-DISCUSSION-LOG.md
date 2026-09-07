# Phase 86: IntelliJ Interop Settings & Targeted Refresh - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-07
**Phase:** 86-intellij-interop-settings-targeted-refresh
**Areas discussed:** Port: auto vs explicit UX, Port: detection source & freshness, Refresh feedback & failure path, Server-side refresh scope

---

## Pre-discussion: matched todos

| Option | Description | Selected |
|--------|-------------|----------|
| Fold none | All four matches reviewed by Phases 84/85 as unrelated | |
| Fold getAllClassNames test drift | Live-interop vitest drift touches the interop path | |
| Fold EM sentinel todo (to close it) | Already delivered by Phase 84 D-12; fold only to close | ✓ |

**User's choice:** Fold the EM sentinel todo to close it.
**Notes:** Verified before folding: `ConfigPaths.configPathArg` and `stripSentinel(getActiveConfigPath())` both exist; no code work remains.

---

## Port: auto vs explicit UX

### Q1 — How does a user express auto-detect vs explicit in Settings?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detect checkbox | On by default; field disabled/greyed with detected value; unchecked = explicit, any value incl. 5008 never overwritten | ✓ |
| Empty field means auto | Blank = auto with placeholder showing detected value; any typed number explicit | |
| No visible change | Field shows effective port; hidden configured flag flips on user edit | |

### Q2 — Auto on but nothing detectable: what does the greyed field show?

| Option | Description | Selected |
|--------|-------------|----------|
| 5008 with an inline hint | Greyed 5008 plus "default; no port found in BBj.properties" hint | ✓ |
| 5008 silently | No explanation | |
| Warning validation on the field | Yellow validator until fixed or unchecked | |

### Q3 — Upgrade migration for installs without the checkbox?

| Option | Description | Selected |
|--------|-------------|----------|
| Infer from saved port | Saved non-5008 → explicit (off, kept); nothing saved/5008 → auto on | ✓ |
| Everyone starts on auto | Detected value wins for all upgraded installs | |
| Everyone starts explicit | Only fresh installs get auto | |

### Q4 — Unchecking auto-detect: what pre-fills the field?

| Option | Description | Selected |
|--------|-------------|----------|
| The current effective value | Detected or 5008, now editable; re-check discards edits | ✓ |
| Blank field | Forces a typed port; needs a new empty-but-explicit rule | |
| Always 5008 | Reset to hard default | |

**User's choice:** Recommended option in all four.
**Notes:** Context given: IntelliJ's serializer omits default-valued fields, so 5008 and "never set" are identical on disk without a flag.

---

## Port: detection source & freshness

### Q1 — Which BBj.properties key, and how?

| Option | Description | Selected |
|--------|-------------|----------|
| com.basis.languageServer.addr only | Parse host:port:enabled (unescape colons), take port, validate; drop old patterns | ✓ |
| That key plus the old patterns | Keep java.interop.port= / bridge.port= as fallbacks | |
| Different key or format | User names another property | |

### Q2 — What about the host and enabled segments?

| Option | Description | Selected |
|--------|-------------|----------|
| Port only; hint when disabled | Port used even if enabled=false, hint says interop disabled; host manual | ✓ |
| Port and host | Detect both under the same checkbox | |
| Port only; ignore the flag | Treat enabled flag as noise | |

### Q3 — Freshness / I/O discipline?

| Option | Description | Selected |
|--------|-------------|----------|
| Cache keyed on file stat | Re-read only on path/mtime/size change (BbjNodeVersionCache precedent); nothing persisted while auto | ✓ |
| Detect once and persist | Write detected value into saved state like home/node | |
| Detect on every read | Disk I/O on EDT from isModified() and every probe tick | |

### Q4 — When does a running server learn a changed detected port?

| Option | Description | Selected |
|--------|-------------|----------|
| Next server start only | Normal initializationOptions channel; probe widget reflects immediately; no watcher | ✓ |
| Trigger a coalesced restart | requestRestart when the cached detection changes | |
| Send the new port to the running server | New bbj/… connection-config request | |

**User's choice:** Recommended option in all four.
**Notes:** Live sample discovered during scouting: `/opt/bbx/cfg/BBj.properties` line 67 `com.basis.languageServer.addr=localhost\:5008\:true`; the existing detector never matches it.

---

## Refresh feedback & failure path

### Q1 — In-flight signal on IntelliJ?

| Option | Description | Selected |
|--------|-------------|----------|
| Background task with progress | Task.Backgroundable "Refreshing Java classes…" (Compile action shape) | ✓ |
| Status-bar widget text only | Widget text/tooltip during the request (Phase 85 style) | |
| Nothing until done | Completion balloon only | |

### Q2 — Success signal?

| Option | Description | Selected |
|--------|-------------|----------|
| Console line, no balloon | One line in the BBj Language Server console; task disappears | ✓ |
| Brief info balloon | Non-sticky info balloon plus console line | |
| Silent | Nothing logged | |

### Q3 — Failure, timeout, or unavailable proxy?

| Option | Description | Selected |
|--------|-------------|----------|
| Warning balloon with Restart action | Reason-keyed warning with "Restart language server" via requestRestart | ✓ |
| Warning balloon, no fallback action | Report only | |
| Fall back to restart automatically | Coalesced restart without asking | |

### Q4 — Re-trigger while in flight; timeout bound?

| Option | Description | Selected |
|--------|-------------|----------|
| Ignore duplicates, 60 s bound | Per-project guard drops duplicates, action stays enabled, console note; 60 s | ✓ |
| Disable the action while running | Grey out until settled | |
| Let them queue | Every click sends a request | |

**User's choice:** Recommended option in all four.

---

## Server-side refresh scope

### Q1 — Change the LS bbj/refreshJavaClasses handler?

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse unchanged | Add method to BbjComposerServer with existing boolean; LS and VS Code untouched | ✓ |
| Return a structured result | {success, reason, classCount, durationMs} with DTO + boundary tests | |
| Also narrow the rebuild | Re-validate open documents only | |

### Q2 — Settings Apply still restarts for host/port changes?

| Option | Description | Selected |
|--------|-------------|----------|
| Leave the Apply restart alone | initializationOptions is the only channel; deferred idea recorded | ✓ |
| Route host/port Apply through a targeted push | New bbj/… request updating connection config | |
| Restart only for server-relevant fields | Skip restart when nothing server-side changed | |

### Q3 — Proof that features stay available during refresh?

| Option | Description | Selected |
|--------|-------------|----------|
| JUnit seams + source guard + one UAT hand check | Fake-server flow tests, no-restart source guard, contract-test name, one recorded hand check | ✓ |
| Automated only | No hand check | |
| Hand check only | Recorded manual verification, no new tests | |

**User's choice:** Recommended option in all three.

---

## Closing check

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context | Write CONTEXT.md and this log | ✓ |
| Explore more gray areas | Identify further areas first | |

## Claude's Discretion

- Names of the persisted auto flag, effective-port accessor, detector/cache classes; parser location.
- Hint, console and balloon wording; checkbox placement; hint widget choice.
- In-flight guard location; timeout constant name.
- Malformed-value cases enumerated by the parser test.
- Documentation update of the IntelliJ Port section (D-19) — not asked; follows from the user-visible setting change.

## Deferred Ideas

- No-restart push of interop host/port changes to a running IntelliJ server.
- Restart on Apply only for server-relevant fields.
- Auto-detect the interop host from the same key.
- Watch BBj.properties for live port changes.
- VS Code java-interop port auto-detection.
- Structured bbj/refreshJavaClasses result payload.
- Narrow refresh re-validation to open documents (Phase 91).
