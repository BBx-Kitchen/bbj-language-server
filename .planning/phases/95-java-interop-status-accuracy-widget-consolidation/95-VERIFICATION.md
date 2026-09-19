---
phase: 95-java-interop-status-accuracy-widget-consolidation
verified: 2026-09-19T18:30:00Z
status: gaps_found
score: 4/5 roadmap criteria fully verified at the code level; 1 criterion partially met (deliberate, documented scope narrowing)
behavior_unverified: 3
overrides_applied: 0
gaps:
  - truth: "ROADMAP criterion 2 (IOP-02/#593), focus-gating clause: 'With no BBj file open, or with the IDE window in the background, the java-interop poll stops re-arming ... and it resumes when a BBj file is focused again.'"
    status: partial
    reason: "Only the editor-selection half of this criterion is implemented. The window-focus half was deliberately NOT implemented (95-CONTEXT.md D-06), on the grounds that the plugin uses no focus/activation API anywhere in src/main/java today and adding one would introduce a new platform coupling plus a second event source racing editor selection. I independently confirmed the premise: no ApplicationActivationListener, WindowFocus, FocusListener, or isActive() exists anywhere in bbj-intellij/src/main/java. REQUIREMENTS.md:38 still carries the literal two-clause IOP-02 text and is checked off Complete; ROADMAP's criterion 2 text is likewise unedited. Accepted cost, stated in D-06 and repeated in 95-02-PLAN.md/95-02-SUMMARY.md: an IDE left open on a BBj file overnight still polls every 5s."
    artifacts:
      - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java"
        issue: "No focus/activation listener exists; the poll gate (InteropPollPolicy) only consults BbjFileVisibility.showsForSelection, never window/IDE-frame focus state."
    missing:
      - "Either (a) accept the deviation via an explicit override — this phase's own precedent (D-11 for IOP-04/#594, and the project's Phase 93 D-05 / Phase 94 D-05 pattern) is to close a requirement 'on cited reasoning, not as written' — and correct REQUIREMENTS.md:38 and ROADMAP's criterion 2 text to drop or footnote the focus clause, recording the window-focus half as deferred (95-CONTEXT.md already has a <deferred> entry for it); or (b) implement ApplicationActivationListener-based gating in a follow-up plan/phase if the overnight-poll cost is judged unacceptable."
---

# Phase 95: java-interop Status Accuracy & Widget Consolidation Verification Report

**Phase Goal:** The java-interop status the IDE reports is true and cheap — no disposed-project
crash, no perpetual background poll, no "Connected" earned by a bare TCP handshake — and the port
default and status-bar widget shape each have exactly one definition.

**Verified:** 2026-09-19T18:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Adjudication: IOP-02 / ROADMAP criterion 2 (the required judgment call)

**Verdict: partially met, and REQUIREMENTS.md's checkbox is mis-marked as written.**

The requirement and the ROADMAP criterion both read as a compound OR: the poll must stop re-arming
when **either** (a) no BBj file is selected, **or** (b) the IDE window lacks focus. Only clause (a)
is implemented, and it is implemented well: `InteropPollPolicy.decide` is a pure, `com.intellij`-free
function with 24 enumerated trigger/gate/previous-gate/server combinations under plain JUnit
(`InteropPollPolicyTest`), wired through a single `applyDecision` chokepoint in
`BbjJavaInteropService`, and structurally pinned by `BbjJavaInteropPollGateSourceGuardTest` (volatile
fields, single-chokepoint routing, silent-pause invariant, no editor read on the pooled thread).

Clause (b) does not exist in the codebase. I grepped `bbj-intellij/src/main/java` for
`ApplicationActivationListener`, `WindowFocus`, `FocusListener`, and `isActive(` and found no matches
anywhere in the module — confirming both 95-CONTEXT.md D-06's premise and the absence of any
partial/stub focus-gating attempt.

This is not an oversight: it is a locked decision (D-06) recorded in 95-CONTEXT.md with explicit
reasoning (no existing focus/activation coupling in the plugin; adding one creates a second event
source that can race editor selection) and an explicitly accepted cost (an IDE left open overnight on
a BBj file still polls every 5s). The same decision is restated in 95-02-PLAN.md's objective and
95-02-SUMMARY.md's closure note ("#593 is closable as implemented, with the focus-gating half recorded
as deliberately deferred"). This phase used the identical "close on cited reasoning, not as written"
pattern for IOP-03/#587 (D-01, exceeding the issue's literal ask) and IOP-04/#594 (D-11, declining the
issue's literal constant name) — both of those closures also left the *issue's* wording technically
unmet while satisfying the ROADMAP's real intent. IOP-02 is the odd one out: unlike IOP-03 and IOP-04,
its ROADMAP criterion itself (not just the GitHub issue) contains the clause that was dropped, and
neither REQUIREMENTS.md nor ROADMAP.md was corrected to record that deliberately-narrowed scope.
REQUIREMENTS.md:38 still reads the original two-clause sentence and is checked `[x]` Complete.

**What I did with this:** I am not silently passing this (the code does not do what the written
criterion says) and I am not silently failing it as an implementation defect (the gap is a disclosed,
reasoned, cost-accepted design decision, not a bug or an omission nobody noticed). I have recorded it
as a structured `gap` in this report's frontmatter, which routes this phase to `gaps_found` rather than
`passed`, specifically so a human makes the call — either accept the deviation explicitly (matching
this phase's own D-11/D-01 precedent, and correcting REQUIREMENTS.md/ROADMAP.md's wording to stop
promising focus-gating this phase never built), or schedule the window-focus half as real follow-up
work. Either resolution is legitimate; what is not legitimate is leaving REQUIREMENTS.md's checkbox
green against text the code does not implement.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Closing a project while a java-interop health check is in flight produces no exception — the in-flight check never reaches `project.getMessageBus()` or `EditorNotifications` on a disposed project. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `BbjJavaInteropService.java` carries three `project.isDisposed()` guards (checkConnection entry :212-214, the constructor's startup invokeLater :113-115, and broadcastStatus's invokeLater lambda :303-305), mirroring `BbjServerService`'s pattern verbatim. Structurally pinned by `BbjJavaInteropServiceDisposalSourceGuardTest` (index-slice assertions proving guard-before-work placement, not just presence). No plain-JUnit test can simulate live IntelliJ project disposal mid-probe (confirmed impossible per 95-01-SUMMARY's own flagged assumption) — the actual disposed-project-during-in-flight-probe scenario has never been exercised end-to-end. Routed to human verification below. |
| 2a | With no BBj file selected, the poll stops re-arming instead of probing every 5 seconds, and it resumes when a BBj file is selected again. | ✓ VERIFIED | `InteropPollPolicy.decide` (24 combinations, `InteropPollPolicyTest`) plus `BbjJavaInteropPollGateSourceGuardTest`'s structural pins (volatile gate fields, single `applyDecision` chokepoint, no editor read on the pooled thread, silent pause). The pure decision logic is genuinely behaviorally tested, not merely present. |
| 2b | ...or with the IDE window in the background, the poll stops re-arming. | ✗ FAILED | Not implemented. No focus/activation API exists anywhere in `bbj-intellij/src/main/java` (grepped: zero matches for `ApplicationActivationListener`, `WindowFocus`, `FocusListener`, `isActive(`). Deliberate, documented (D-06). See Adjudication above and the structured gap in frontmatter. |
| 2c | The live poll actually stops/resumes in a running IDE, and the immediate-check-on-gate-open closes the old 5s-blind-window. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | The decision logic is proven (2a); whether `checkAlarm` actually stops re-arming and the CHECKING transition reads as a legible-not-flicker state in a real IDE session needs a live IDE. Carried in 95-02-PLAN.md's own `<human-check>` block; routed to human verification below. |
| 3 | The status bar reads "Java: Connected" only when the listening peer is confirmed to be java-interop; a foreign process squatting on the configured port does not produce a Connected status. | ✓ VERIFIED | `InteropProbeClient.probe()` requires a valid, non-error `getTopLevelPackages` JSON-RPC result; `InteropProbeClientTest` proves all three verdicts (CONFIRMED, WRONG_PEER, UNREACHABLE) against real throwaway sockets, not mocks. `checkConnection()` routes through the probe (`grep -c "new Socket("` in the service returns 0 — the raw socket moved into the probe client). `WRONG_PEER` earns its own status/tooltip/banner via `InteropStatusPresentation`. Code review's CR-01 (a real race where a stale in-flight probe could resurrect CONNECTED after the server stopped) was found and fixed (commit `501be102`) — verified by reading the current source: `checkConnection()`'s tail now re-reads live server status and gates the status write on it. |
| 3b | Live confirmation against the maintainer's squatting-BBjServices machine. | (declared, not a regression) | Explicitly required by 95-01-PLAN.md's `<human-check>` block. This is an intended, user-visible change (new WRONG_PEER status text + reason-varying banner) per the task brief — listed in human verification below, not reported as a regression. |
| 4 | The UI placeholder, the persisted default and the "changed from default" check for the java-interop port all read one named constant, so they cannot drift apart. | ✓ VERIFIED | `BbjSettings.java:30`, `BbjSettingsComponent.java:189,461,466` all read `BbjInteropPortDetector.DEFAULT_PORT` (confirmed by direct source read). Zero raw `5008` literals survive outside the detector — `EffectiveInteropPortSourceGuardTest#exactlyOnePortLiteralSurvivesTreeWide` walks the whole `src/main/java` tree, comment-strips, and asserts exactly one occurrence, with an anti-vacuity control and a documented falsification (throwaway literal added to an out-of-scope file, guard observed red, file restored byte-identical, guard re-verified green). Value held at 5008 throughout, preserving `InteropPortSettings.migratedAutoDetect`'s upgrade-inference keying. |
| 5 | Both status-bar widgets and their factories share one base, and both still show, hide, update and tooltip exactly as they did — including hiding for `BBx Config` and non-BBj tabs on the click itself. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `BbjStatusBarWidgetBase<S>` (confirmed by direct source read) holds every shared member (panel, labels, MouseAdapter, `messageBusConnection` lifecycle, `FILE_EDITOR_MANAGER` subscription, `updateVisibility()`, `dispose()`); both widgets are thin subclasses supplying only their topic, status mapping, tooltip and popup items. `plugin.xml`'s two `statusBarWidgetFactory` registrations are unmodified (confirmed by direct read — both `implementation=` entries still point at the original concrete classes). `BbjStatusBarWidgetSourceGuardTest`'s re-pointed index-slice pins were falsification-proven (dispose pin deliberately removed, guard observed red, file restored, guard re-verified green). The actual on-screen show/hide/tooltip/popup-item rendering matrix (including "hidden on the click itself" for `BBx Config` and non-BBj tabs) has no automated coverage — no live IntelliJ UI test exists in this project by design. Routed to human verification below, per 95-04-PLAN.md's own `<human-check>` block. |
| 5b | The Java widget's first-ever tooltip. | (declared, not a regression) | Intended, user-visible change (D-14) — `BbjJavaInteropStatusBarWidget.tooltipFor` now calls `InteropStatusPresentation.tooltip(...)`, confirmed by direct source read. Listed in human verification below, not a regression. |

**Score:** 4 of 5 ROADMAP criteria are fully or predominantly code-verified (1, 3, 4, 5 at the
structural/decision-logic level); criterion 2 is genuinely partial (editor-selection clause done,
window-focus clause not implemented — a disclosed scope decision, not an oversight). 3 truths are
present-and-wired but behaviorally unverifiable outside a running IDE (1, 2c, 5) and are routed to
human verification rather than marked failed, per this project's standing convention (no live
IntelliJ UI test coverage in CI by design).

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `bbj-intellij/.../interop/InteropProbeClient.java` | LSP4J probe + Verdict classification | ✓ VERIFIED | Exists, zero `com.intellij` imports, three-way `Verdict` enum (CONFIRMED/WRONG_PEER/UNREACHABLE), socket close + executor teardown in `finally` (WR-02/WR-03 fixes present). |
| `bbj-intellij/.../interop/InteropStatusPresentation.java` | Platform-free status text/tooltip/banner | ✓ VERIFIED | Exists, zero `com.intellij` imports, all three methods present, `bannerText` returns null for CONNECTED/CHECKING and distinct sentences for DISCONNECTED/WRONG_PEER. |
| `bbj-intellij/.../interop/InteropPollPolicy.java` | Pure gate decision seam | ✓ VERIFIED | Referenced from `BbjJavaInteropService` at exactly the three call sites the plan specifies (`handleServerStarted`, `refreshSelectionGate`, `checkConnection`'s tail). |
| `bbj-intellij/.../ui/BbjJavaInteropService.java` | Rewritten checkConnection, disposal guards, poll gate | ✓ VERIFIED | 3 `project.isDisposed()` occurrences (confirmed via grep -c), CR-01/WR-01 fixes present (live server-status re-read, `volatile currentStatus`/`firstCheckCompleted`), 0 `new Socket(` occurrences. |
| `bbj-intellij/.../ui/BbjStatusBarWidgetBase.java` | Generic abstract widget base | ✓ VERIFIED | Exists, abstract, one type parameter, 7 abstract hooks, `updateStatus`/`addOpenSettingsItem` shared helpers present. |
| `bbj-intellij/.../ui/BbjStatusBarWidgetFactoryBase.java` | Shared factory base | ✓ VERIFIED | plugin.xml registrations confirmed unmodified by direct read. |
| `bbj-intellij/.../BbjSettings.java`, `BbjSettingsComponent.java` | Re-pointed port literals | ✓ VERIFIED | All four sites read `BbjInteropPortDetector.DEFAULT_PORT`; no raw `5008` literal remains (confirmed via grep). |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `BbjJavaInteropService.checkConnection()` | `InteropProbeClient.probe` | replaces bare Socket connect | ✓ WIRED | Confirmed in source: `InteropProbeClient.Verdict verdict = InteropProbeClient.probe(...)`. |
| `BbjJavaInteropNotificationProvider` | `InteropStatusPresentation.bannerText` | reason-varying banner text | ✓ WIRED | Confirmed in source: `String bannerText = InteropStatusPresentation.bannerText(currentStatus.name());`. |
| `BbjJavaInteropStatusBarWidget` | `InteropStatusPresentation.statusText`/`tooltip` | label and tooltip hooks | ✓ WIRED | Confirmed in source: `textFor`/`tooltipFor` both delegate to the seam (WR-04 fix landed — no independent duplicated literals remain). |
| `BbjJavaInteropService` (poll gate) | `InteropPollPolicy.decide` | every re-arm/pause/check decision | ✓ WIRED | Confirmed exactly 3 call sites, one per `Trigger`, each routed through the single `applyDecision` chokepoint. |
| `BbjStatusBarWidget`/`BbjJavaInteropStatusBarWidget` | `BbjStatusBarWidgetBase` | extends, generic on status type | ✓ WIRED | Confirmed in source for both subclasses. |
| `BbjSettings`/`BbjSettingsComponent` | `BbjInteropPortDetector.DEFAULT_PORT` | port default reference | ✓ WIRED | Confirmed in source, all four sites. |

### Behavioral Spot-Checks

| Behavior | Evidence | Status |
|---|---|---|
| WRONG_PEER classification against a real (throwaway) socket peer, a silent squatter, and a closed port | `InteropProbeClientTest` — three cases against real `ServerSocket` instances, per 95-01-SUMMARY | ✓ PASS (executed during phase execution, not re-run per this verification's instruction not to run Gradle) |
| Poll-gate decision function across all trigger/gate/server combinations | `InteropPollPolicyTest` — 24 combinations + empty-selection edge case, per 95-02-SUMMARY | ✓ PASS (executed during phase execution) |
| Port-literal drift guard actually catches drift | `EffectiveInteropPortSourceGuardTest` falsification (throwaway literal in `BbjHomeDetector.java`, observed red, restored byte-identical via sha256, re-verified green), per 95-03-SUMMARY | ✓ PASS (executed during phase execution) |
| Widget source guard actually catches a removed pin | `BbjStatusBarWidgetSourceGuardTest` falsification (dispose pin removed, observed red, restored byte-identical via sha256, re-verified green), per 95-04-SUMMARY | ✓ PASS (executed during phase execution) |
| Whole IntelliJ suite green under forced re-run | 1040 tests, 0 failures, 0 errors, per 95-04-SUMMARY and this verification's own instruction not to re-run Gradle (already confirmed post-fix-pass) | ✓ PASS (not independently re-run per explicit task instruction — the post-fix-pass green run is accepted as of-record evidence per the task brief) |

Per this task's explicit instruction, I did not run `./gradlew` myself — the whole-suite green run
(1040 tests, 0 failures, 0 errors) from the post-fix-pass tree is taken as given, and I instead
verified by reading the actual source files that every code-review fix (CR-01, WR-01, WR-02, WR-03,
WR-04) is genuinely present in the current tree, not merely claimed in 95-REVIEW.md's resolution
notes. All five are confirmed present by direct source read (see truths 1 and 3 above, and the file
reads performed during this verification).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| IOP-01 (#592) | 95-01 | Disposal-safe in-flight health check | ✓ SATISFIED | 3 `isDisposed()` guards, structurally pinned; live-disposal scenario routed to human verification (truth 1). |
| IOP-02 (#593) | 95-02 | Poll stops re-arming while no BBj file open **or IDE unfocused** | ⚠️ PARTIALLY SATISFIED | Editor-selection clause fully implemented and tested; window-focus clause not implemented (deliberate D-06). See Adjudication above and the structured gap. |
| IOP-03 (#587) | 95-01 | Connected status requires confirmed peer identity | ✓ SATISFIED | Real LSP4J round trip via `InteropProbeClient`; socket-backed test coverage of all three verdicts; live-squatter confirmation routed to human verification. |
| IOP-04 (#594) | 95-03 | One named port-default constant | ✓ SATISFIED | Single surviving literal, falsification-proven guard. |
| IOP-05 (#620) | 95-04 | Shared widget/factory base | ✓ SATISFIED (structurally) | Generic base + thin subclasses; plugin.xml unmodified; rendering matrix routed to human verification. |

No orphaned requirements: all five IDs (IOP-01..05) that REQUIREMENTS.md maps to Phase 95 appear as
`requirements:` in exactly one plan's frontmatter each (95-01: IOP-03, IOP-01; 95-02: IOP-02; 95-03:
IOP-04; 95-04: IOP-05).

### Anti-Patterns Found

None. Grepped every file modified in this phase for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`
and found zero matches. Grepped the whole phase's `.java` diff (`git diff ddbda609 HEAD -- '*.java'`)
for stray `D-NN`/`CR-NN`/`WR-NN`/`C-NN` planning identifiers and found zero matches — the executors'
own self-reported greps are corroborated.

## Human Verification Required

Per this project's standing convention (no live IntelliJ UI test coverage in CI by design — verified
via plain-JUnit seams, whole-file source guards, and hand UAT in a running IDE), the following items
are routed to human verification rather than marked failed or left unverifiable. Two of these are
**intended, user-visible changes** and must be confirmed as such, not reported as regressions.

### 1. Disposed-project safety during an in-flight health check

**Test:** With java-interop running, trigger a check tick (or wait for one to start), then close the
project while the check is in flight (within the ~3s TCP+response window).
**Expected:** No exception in the IDE log; no crash; the project closes cleanly.
**Why human:** No plain-JUnit test can simulate live IntelliJ project disposal mid-probe; only
structural source guards exist (95-01-SUMMARY's own flagged assumption).

### 2. Poll gating and CHECKING legibility in a running IDE

**Test:** With java-interop up, watch the Java status-bar widget across several poll ticks — confirm
CHECKING is legible but does not read as flicker. Switch to a non-BBj tab and confirm the poll stops
(no further ticks), then switch back to a BBj file and confirm the status updates immediately (not
after a 5s wait).
**Expected:** CHECKING appears briefly and clearly on each tick; the poll visibly pauses on a non-BBj
tab; selection back to a BBj file triggers an immediate check, not a 5s-delayed one.
**Why human:** The decision logic is proven by plain JUnit; the actual `Alarm` re-arm/pause behavior
and perceived flicker need a running IDE session. (Carried from 95-02-PLAN.md's own `<human-check>`
block.)

### 3. WRONG_PEER rendering against the live squatting-BBjServices reproduction

**Test:** On the maintainer's machine where BBjServices squats on port 5008 without speaking the
interop protocol, open a `.bbj` file and confirm: (1) the Java status-bar widget shows "Java: Wrong
peer", NOT "Java: Connected"; (2) hovering shows the wrong-peer tooltip naming the actual situation;
(3) the editor banner names the port collision and no longer says "Start BBjServices."
**Expected:** All three render correctly; this is an intended, user-visible change (D-01/D-04/D-05),
not a regression.
**Why human:** String-level distinctness is unit-tested; live rendering correctness needs the actual
squatting reproduction. (Carried from 95-01-PLAN.md's own `<human-check>` block.)

### 4. Widget consolidation's full rendering matrix

**Test:** With a `.bbj` file selected, both widgets visible. On a `BBx Config` file and a non-BBj tab,
both hidden on the click itself. Open both popup menus and exercise every item (Restart Server / Open
Settings / Show Server Log on the BBj widget; Reconnect / Open Settings on the Java widget — both
Open Settings items must land on the same BBj settings page). Hover the Java widget — it now shows a
tooltip it has never had (D-14, intended, not a regression); confirm the BBj widget's existing tooltip
(including its config-reload reason suffix) is unchanged. Watch both widgets through their full status
transitions.
**Expected:** All rendering paths behave exactly as before the consolidation, except the Java widget's
new tooltip.
**Why human:** No live IntelliJ UI test coverage exists in CI; the source guard proves structural
invariants, not on-screen behavior. (Carried from 95-04-PLAN.md's own `<human-check>` block.)

## Gaps Summary

One structured gap: ROADMAP criterion 2 / IOP-02's window-focus clause was never implemented. This is
a disclosed, reasoned, cost-accepted scope decision (95-CONTEXT.md D-06), not an oversight — the
editor-selection half of the same criterion is implemented thoroughly and well-tested. The gap exists
because neither REQUIREMENTS.md nor ROADMAP.md's text was corrected to reflect the narrowed scope, so
REQUIREMENTS.md currently shows a checked-off `[x] Complete` against text the code does not fully
satisfy. This phase's own precedent (D-01 for IOP-03, D-11 for IOP-04) is to close a requirement "on
cited reasoning, not as written" — that pattern was applied to the two GitHub issues but was never
applied to correct the ROADMAP/REQUIREMENTS wording for IOP-02 specifically, and the ROADMAP criterion
itself (not just the issue) contains the unmet clause. Recommended resolution: accept an override for
this criterion (the reasoning is sound and well-precedented in this codebase) and correct
REQUIREMENTS.md:38 / ROADMAP's criterion 2 text to name the editor-selection gating actually built and
record the window-focus half as explicitly deferred, OR schedule a follow-up plan to add
`ApplicationActivationListener`-based gating if the overnight-poll cost is judged unacceptable.

Everything else in this phase — disposal safety, peer confirmation, port-constant consolidation, and
widget/factory consolidation — is either fully code-verified with strong behavioral test evidence
(criteria 3, 4) or structurally verified and wired with the remaining rendering/live-behavior
questions correctly routed to human verification rather than failed (criteria 1, 5, and criterion 2's
implemented half). All five code-review findings marked "fixed" in 95-REVIEW.md (CR-01, WR-01, WR-02,
WR-03, WR-04) were independently confirmed present in the current source during this verification, not
merely trusted from the review's own resolution notes.

---

_Verified: 2026-09-19T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
