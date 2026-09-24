# Phase 102: Live Compiler Diagnostics With Backward Compatibility - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-22
**Phase:** 102-live-compiler-diagnostics-with-backward-compatibility
**Areas discussed:** Todos, Trigger & settings, Mode detection & visibility, Diagnostic appearance, Docs & verification

---

## Todos (cross-reference)

| Option | Description | Selected |
|--------|-------------|----------|
| None | All five matches were reviewed and not folded in Phase 101; none touches the parseProgram client | ✓ |
| linking.test.ts interop failures | Test-harness todo in the same test module the double lives in | |
| Loosen single-line IF balance rule | Validator residue (A2 27 vs 25) | |
| IntelliJ lifecycle/log/Node todos | Three IntelliJ-side items; no bbj-intellij change planned | |

**User's choice:** None
**Notes:** Standing preference for lean phases without folded todos, carried from Phases 100 and 101.

---

## Trigger & settings

### Relation to bbj.compiler.trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Same switch, no new setting | `off` disables both; `debounced`/`on-save` enable the live parse when the endpoint exists; bbjcpl unchanged | ✓ |
| Own toggle | New `bbj.compiler.liveDiagnostics` boolean; needs VS Code setting and IntelliJ plumbing | |
| Always on when the endpoint exists | Ignore the trigger; only the endpoint's presence decides | |

**User's choice:** Same switch, no new setting

### Pacing

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse the 500 ms compile debounce | Same trailing-edge timer as the bbjcpl run in the document builder | ✓ |
| Faster dedicated debounce | Own 250-300 ms timer, second timer map | |
| No client debounce | Send on every Langium build, rely on server supersession | |

**User's choice:** Reuse the 500 ms compile debounce

### The bbjcpl run with the endpoint live

| Option | Description | Selected |
|--------|-------------|----------|
| Unchanged, duplicates accepted | bbjcpl keeps running; overlap until Phase 103 | ✓ |
| Skip bbjcpl while the endpoint is live | Suppress the debounced bbjcpl run when the probe says on | |

**User's choice:** Unchanged, duplicates accepted

### On open

| Option | Description | Selected |
|--------|-------------|----------|
| On open too | First build after didOpen sends a parse, same gate as bbjcpl | ✓ |
| Only after an edit | Nothing sent until the user types | |

**User's choice:** On open too
**Notes:** User moved to the next area after the four questions.

---

## Mode detection & visibility

### Probe timing

| Option | Description | Selected |
|--------|-------------|----------|
| First real parse is the probe | MethodNotFound latches off, a result latches on; getAllClassNames pattern | ✓ |
| Eager empty-text probe at connect | One extra request per connection; mode known before any editor needs it | |

**User's choice:** First real parse is the probe

### Latch reset

| Option | Description | Selected |
|--------|-------------|----------|
| Every new socket connection | Re-probe after reconnect and after cache clear | ✓ |
| Once per language-server lifetime | Keep the verdict until the server restarts | |

**User's choice:** Every new socket connection

### Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Server log only | One info line per connection, warn lines for failures, no client change | ✓ |
| Log plus a status-bar indicator | New notification plus item like "BBjCPL: unavailable"; needs both IDE clients | |
| Log plus a one-time information popup | showInformationMessage once per session | |

**User's choice:** Server log only

### Log cadence

| Option | Description | Selected |
|--------|-------------|----------|
| First failure at warn, then debug until recovery | One warn per connection per failure kind; success clears the latch | ✓ |
| Every failure at warn | A line per debounced keystroke on a timing-out server | |
| Silent except at debug level | Failures never reach the default log | |

**User's choice:** First failure at warn, then debug until recovery
**Notes:** User moved to the next area after the four questions.

---

## Diagnostic appearance

### Source tag

| Option | Description | Selected |
|--------|-------------|----------|
| New source, no tier change | Distinct source string (proposal 'BBj Parser'); Phase 103 decides interaction | ✓ |
| Reuse 'BBjCPL' | Existing Rule 0 would suppress Langium parse errors unconditionally now | |

**User's choice:** New source, no tier change

### Category placement

| Option | Description | Selected |
|--------|-------------|----------|
| As the diagnostic code | Message stays BBj's text; categories joined into `code` | ✓ |
| Prefixed in the message | '[SyntaxError] message' | |
| Dropped | Only the message | |

**User's choice:** As the diagnostic code

### Bad range

| Option | Description | Selected |
|--------|-------------|----------|
| Clamp to the nearest valid range | Line to last line, character to line end, collapsed range spans the line | ✓ |
| Drop the diagnostic and log it | Treated like an endpoint failure | |

**User's choice:** Clamp to the nearest valid range

### Error cap

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same cap | `bbj.diagnostics.maxErrors` truncates the live list per document | ✓ |
| No cap for the parser | Show every error BBj returns | |

**User's choice:** Yes, same cap
**Notes:** User moved to the next area after the four questions.

---

## Docs & verification

### Docs placement

| Option | Description | Selected |
|--------|-------------|----------|
| Prerequisites line plus a features paragraph | Both guides: keep 25.00 base, add 26.03 line, features.md entry, index.md Requirements one-liner | ✓ |
| Prerequisites line only | One-liner in getting-started and index.md only | |
| Dedicated section in configuration.md | Full section with setting interaction, log lines, troubleshooting | |

**User's choice:** Prerequisites line plus a features paragraph

### Service double

| Option | Description | Selected |
|--------|-------------|----------|
| Scriptable double in the test module | Extend JavaInteropTestService: MethodNotFound by default, scriptable results and -3300x errors | ✓ |
| In-process fake JSON-RPC server | vscode-jsonrpc server over a stream pair lacking the method | |
| Real socket, gated on :5008 | Live tests only under RUN_BBJ_TESTS | |

**User's choice:** Scriptable double in the test module

### Coordinate tests

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-written DTO fixtures plus a gated live check | Unit tests per PSRV-05 case plus one RUN_BBJ_TESTS-gated live test | ✓ |
| Hand-written fixtures only | Trust the MR's convention | |
| Live tests only | Every coordinate test needs BBjServices | |

**User's choice:** Hand-written DTO fixtures plus a gated live check

### Jar under test

| Option | Description | Selected |
|--------|-------------|----------|
| Deployed jar as-is; review fixes stay a bbj-ls follow-up | Code to the MR contract; the five critical 101-REVIEW fixes happen separately in bbj-ls | ✓ |
| Fix the 101-REVIEW findings first, inside this phase | First plan patches bbj-ls and redeploys; phase spans two repositories | |

**User's choice:** Deployed jar as-is; review fixes stay a bbj-ls follow-up
**Notes:** User declared the area done and was ready for context; no further gray areas requested.

---

## Claude's Discretion

- Service file/class naming and whether the latch lives on `JavaInteropService` or in the new service.
- Request payload details (canonical name, version string, prefixes, workspace roots).
- Converter internals, in-flight cancellation versus dropping a superseded result.
- Exact log-line wording, joined-category separator, exact source label text.
- Plan split and order.

## Deferred Ideas

- Status-bar indicator or notification for live-diagnostics mode.
- A dedicated `bbj.compiler.liveDiagnostics` toggle.
- Making `on-save` differ from `debounced` in the server (pre-existing gap; description says 2 s, code says 500 ms).
- Skipping bbjcpl while the endpoint is live (Phase 103 decides).
- The five critical `101-REVIEW.md` findings in `bbj-ls` (follow-up before the MR merges).
- A configuration-page section with log lines and troubleshooting.
