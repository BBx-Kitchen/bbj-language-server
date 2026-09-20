# Phase 95: java-interop Status Accuracy & Widget Consolidation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-19
**Phase:** 95-java-interop Status Accuracy & Widget Consolidation
**Areas discussed:** Peer confirmation depth (IOP-03), Poll gating + paused status (IOP-02), Port constant home (IOP-04), Widget base shape + tooltip (IOP-05)

All four offered gray areas were selected for discussion. IOP-01 (#592) was presented as not gray —
`BbjServerService:132,166,184,199` is the sibling pattern to copy verbatim — and left to Claude's
discretion.

---

## Peer confirmation depth (IOP-03)

### How far should IOP-03 go?

| Option | Description | Selected |
|--------|-------------|----------|
| Real JSON-RPC probe from IntelliJ | Replace the bare TCP connect with an LSP4J request; makes ROADMAP criterion 3 literally true; corrects #587's acceptance criteria as too narrow | ✓ |
| Document-only, as #587 literally asks | Add the limitation to the class doc; cheapest; ROADMAP criterion 3 corrected instead | |
| Ask the language server (new `bbj/*` request) | Retire the plugin's probe, let the LS report; best fit for the "no reimplementation on the IntelliJ side" constraint | |

**User's choice:** Real JSON-RPC probe from IntelliJ
**Notes:** The language-server route was presented with its wrinkle named — the LS connects lazily,
so its breaker reads `closed` before any lookup has happened and is not a reachability signal.
Feasibility for the chosen option was established before asking: LSP4J is already on the plugin
classpath and already used in main code, the allowlist guards only `com.redhat.devtools.lsp4ij`,
and the backend's accept loop serves each connection independently so a probe cannot steal the
language server's socket.

### What should the probe send?

| Option | Description | Selected |
|--------|-------------|----------|
| `getTopLevelPackages`, expect a valid result | Exists in both backends, no params, cheap, needs no prior `loadClasspath`; strongest evidence | ✓ |
| Unknown method, accept a well-formed JSON-RPC error | Zero backend work, immune to method-set drift; proves only "speaks JSON-RPC" | |
| `getTopLevelPackages`, accept any well-formed reply | Tolerant of renames; cannot distinguish java-interop from another LSP4J speaker | |

**User's choice:** `getTopLevelPackages`, expect a valid result
**Notes:** The method-set drift that motivated the middle option is real and was verified —
`getAllClassNames` exists in `bbj-ls` but not in `java-interop/` — which is exactly why the probe
targets `getTopLevelPackages`, present in both.

### Timeout budget

| Option | Description | Selected |
|--------|-------------|----------|
| Split: keep 1s connect, add ~2s response | Worst case stays inside the 5s interval; distinguishes "refused" from "accepted but silent" | ✓ |
| One total budget of ~1s | Preserves today's worst-case tick cost; risks calling a slow-but-healthy service Disconnected | |
| You decide | Leave numbers to planning | |

**User's choice:** Split budget: keep 1s connect, add ~2s response
**Notes:** The existing 2s grace period is explicitly untouched.

### What the user sees for a wrong peer

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct text + tooltip, reuse the disconnected icon | No new SVG; distinguishes a port collision from a stopped service | ✓ |
| Collapse into Disconnected | Smallest change; satisfies criterion 3 literally; user cannot tell a collision from an outage | |
| New state with its own icon | Clearest; needs new light and dark SVG assets | |

**User's choice:** Distinct text + tooltip, reuse the disconnected icon
**Notes:** Only `INTEROP_CONNECTED` and `INTEROP_DISCONNECTED` exist today (`BbjIcons:12-13`), which
is what made the icon-reusing middle option the cheap one. Text and tooltip are routed through a
platform-free presentation seam modelled on `ConfigReloadPresentation`.

### The editor banner

| Option | Description | Selected |
|--------|-------------|----------|
| Vary the text by reason, same seam | The wrong-peer case names the port collision instead of telling the user to start a running service | ✓ |
| One banner text for every non-connected state | Leaves the provider untouched; keeps Phase 96 file-disjoint; banner stays misleading | |
| Suppress the banner for the wrong-peer case | Says nothing wrong; drops the strongest signal that completions will not work | |

**User's choice:** Vary the text by reason, same seam
**Notes:** Accepted with the cross-phase consequence stated up front — this edits
`BbjJavaInteropNotificationProvider`, one of the three providers Phase 96's PLAT-03 consolidates,
so ROADMAP's "file-disjoint from Phases 93-95" claim for Phase 96 becomes false.

---

## Poll gating + paused status (IOP-02)

### What gates the 5-second re-arm?

| Option | Description | Selected |
|--------|-------------|----------|
| Selected BBj file only, via `BbjFileVisibility` | Reuses the widgets' own predicate; no new platform coupling; #593 names it first | ✓ |
| BBj file selected AND window focused | Also stops the overnight drain; introduces the plugin's first focus-API coupling | |
| Window focus only | Single condition; keeps polling while editing non-BBj files | |

**User's choice:** Selected BBj file only, via `BbjFileVisibility`
**Notes:** Established before asking that the plugin uses no focus or activation API anywhere in
`src/main/java` — no `ApplicationActivationListener`, `IdeFrame`, `WindowManager`, `PowerSaveMode`
or `IdeEventQueue`. Accepted cost: an IDE left open on a BBj file overnight still polls.

### Status while paused

| Option | Description | Selected |
|--------|-------------|----------|
| Freeze the last known status, broadcast nothing | Cheapest; cannot flash a wrong banner; depends on an immediate check at gate-open | ✓ |
| Report DISCONNECTED while paused | Never claims an unverified connection; would raise the banner on a mere tab switch | |
| Report CHECKING while paused | Banner already suppresses CHECKING; overloads "in flight" with "not running" | |

**User's choice:** Freeze the last known status, broadcast nothing

### Verification shape

| Option | Description | Selected |
|--------|-------------|----------|
| Plain-Java decision seam + JUnit, plus source guards and UAT | Follows the seven existing seams in-tree; first real coverage for this service | ✓ |
| Source guards plus hand UAT only | Less new structure; leaves the probe's classification untested | |

**User's choice:** Plain-Java decision seam + JUnit, plus source guards and UAT
**Notes:** `BbjJavaInteropService` has zero test coverage today — only two source guards reference
it at all.

### Immediate check on gate-open?

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate check on gate-open, then the 5s cadence | Closes a five-second blind window that already exists today | ✓ |
| Wait one full interval, as today | Smallest scheduling change; preserves the stale window | |

**User's choice:** Immediate check on gate-open, then the 5s cadence
**Notes:** Recorded as a research item for planning — the poll runs on a `POOLED_THREAD` `Alarm`, so
the gate likely needs a volatile flag updated from the editor event rather than calling
`FileEditorManager.getSelectedFiles()` off the EDT.

### The dead CHECKING state

| Option | Description | Selected |
|--------|-------------|----------|
| Put it to use for the in-flight probe | The probe now has a real 1s+2s duration; banner's existing suppression finally applies | ✓ |
| Delete it | Smallest enum for the new base to map; removes never-executed code | |
| Leave it dead, out of scope | Changes nothing; base is built around an impossible value | |

**User's choice:** Put it to use for the in-flight probe
**Notes:** Surfaced during scouting — `CHECKING` is never assigned anywhere in the service, yet the
banner special-cases it. UAT must confirm the extra transition per tick does not read as flicker.

---

## Port constant home (IOP-04)

### Which constant is canonical?

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse `BbjInteropPortDetector.DEFAULT_PORT` | Already the de facto constant with three consumers; `com.intellij`-free | ✓ |
| Add `BbjSettings.DEFAULT_JAVA_INTEROP_PORT` as a delegating alias | Matches the issue's wording with no duplicated value; two names for one number | |
| Move the canonical constant onto `BbjSettings` | Matches #594 word for word; inverts the dependency and breaks the platform-free convention | |

**User's choice:** Reuse `BbjInteropPortDetector.DEFAULT_PORT`
**Notes:** #594's evidence was found stale before asking — its cited lines no longer match the file
and it claims three files carry the literal when only two do (`BbjSettingsConfigurable` carries
none). Close #594 as done with this reasoning, per the Phase 93 D-05 / Phase 94 D-05 precedent.

### Enforce or clean up once?

| Option | Description | Selected |
|--------|-------------|----------|
| Add a source-guard assertion pinning it | Makes "no remaining independent occurrence" durable rather than a one-time tidy | ✓ |
| One-time cleanup, no new guard | Less test surface; the criterion can quietly stop being true later | |

**User's choice:** Add a source-guard assertion pinning it
**Notes:** Comment-stripping is required, not optional — `BbjInteropPortDetector:28` and
`InteropPortSettings:32,49,53` mention 5008 in prose and would otherwise trip the count.
`EffectiveInteropPortSourceGuardTest:69-72` already has the helper to copy.

---

## Widget base shape + tooltip (IOP-05)

### Base shape

| Option | Description | Selected |
|--------|-------------|----------|
| Abstract generic base + two thin subclasses | Phase 93 D-05/D-06 precedent; every difference a compile-time-checked hook; `plugin.xml` unchanged | ✓ |
| One concrete class, parameterized at construction | #620's literal wording; Phase 93 rejected this shape twice; the two status enums are unrelated types | |
| Partial base — shared chrome only, no generics | Smallest diff, no generics; leaves the subscribe/render sequence duplicated | |

**User's choice:** Abstract generic base + two thin subclasses

### Tooltip

| Option | Description | Selected |
|--------|-------------|----------|
| Base responsibility, via an abstract tooltip hook | One path for both widgets; the BBj widget's existing `ConfigReloadPresentation` call becomes its hook | ✓ |
| Subclass-local, base sets no tooltip | Smaller base; leaves the one piece this phase adds to both widgets duplicated | |

**User's choice:** Base responsibility, via an abstract tooltip hook
**Notes:** The earlier IOP-03 decision had already committed the interop widget to carrying a
wrong-peer tooltip, so the existing asymmetry had to end regardless. Flagged as an intended
observable change for UAT: the Java widget gains a tooltip it never had.

### The "Open Settings" item

| Option | Description | Selected |
|--------|-------------|----------|
| Unify on `BbjSettingsConfigurable.class` | Exact; cannot break if the display name changes; already what the interop widget does | ✓ |
| Unify on the `"BBj"` display-name string | The variant the older widget has shipped with longest | |
| You decide | Implementation detail for planning | |

**User's choice:** Unify on `BbjSettingsConfigurable.class`
**Notes:** Surfaced during scouting — the two widgets call `ShowSettingsUtil` differently today
(`BbjStatusBarWidget:134` by string, `BbjJavaInteropStatusBarWidget:124` by class). Both reach the
same page, so this is not an observable change.

---

## Claude's Discretion

- IOP-01 (#592) in full — presented as not gray; `BbjServerService:132,166,184,199` is the sibling
  pattern to copy verbatim.
- Names and packages of every new class: widget base, factory base, probe client, presentation
  seam, and the poll-gate / status-classification seam, including whether the latter is one class
  or two.
- Exact wording of the wrong-peer status text, its tooltip, and the reason-varying banner sentences.
- The exact response-timeout number, within the split-budget constraint.
- Names of new and re-pointed guard tests, and whether the single-occurrence assertion extends
  `EffectiveInteropPortSourceGuardTest` or lives in a new guard.
- Javadoc wording throughout.

## Deferred Ideas

- Window-focus / idle gating for the poll — rejected only for lack of existing focus-API coupling;
  would compose with the selection gate rather than replace it.
- `bbj/javaInteropStatus` as a shared language-server request — revisit if VS Code ever grows an
  interop status indicator.
- The plugin probing java-interop at all is architecturally duplicative; this phase improves the
  workaround's accuracy without removing it.
- Unifying `BbjJavaInteropService`'s raw `Alarm` onto the `Scheduler` seam, which `AlarmScheduler`'s
  own javadoc was written to abstract.
- Phase 96 PLAT-03 must absorb whatever the banner change leaves behind, and its "file-disjoint"
  premise needs correcting.
- Four keyword-matched todos reviewed and not folded — the same four Phases 93 and 94 rejected.
