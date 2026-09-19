---
phase: "95"
slug: "java-interop-status-accuracy-widget-consolidation"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-19"
---

# Phase 95 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 (`org.junit.jupiter`) via `junit-bom:6.1.3` — `bbj-intellij/build.gradle.kts:39-41` |
| **Config file** | `bbj-intellij/build.gradle.kts` (`tasks.withType<Test>().configureEach { useJUnitPlatform() }`) |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.ui.*"` (or a single named class) |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --rerun-tasks` |
| **Estimated runtime** | Not measured this phase — the IntelliJ module's JUnit suite stood at 865 tests entering v4.4 |

**`--rerun-tasks` is not optional on the full-suite run.** Phase 94 recorded that a plain
`./gradlew test` can report `Task :test UP-TO-DATE` and mask a stale green against the phase's final
edits. Every phase-gate run uses `--rerun-tasks`.

---

## Sampling Rate

- **After every task commit:** targeted class run — the quick run command above
- **After every plan wave:** `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --rerun-tasks`
- **Before `/gsd-verify-work`:** full suite green, plus the hand-UAT rows below
- **Max feedback latency:** one targeted Gradle invocation per task (seconds-scale; the module has no live-IDE tests to wait on)

---

## Per-Task Verification Map

Task IDs are assigned when PLAN.md files are created; this map is seeded at requirement level from
RESEARCH.md's Validation Architecture and is filled in per task during execution.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| pending | TBD | TBD | IOP-01 (#592) | — | In-flight health check never reaches `getMessageBus()` / `EditorNotifications` on a disposed project | source guard (no live IDE disposal is simulable in plain JUnit) | `./gradlew test --tests "*BbjJavaInteropService*SourceGuard*"` | ❌ W0 | ⬜ pending |
| pending | TBD | TBD | IOP-02 (#593) | — | Poll re-arms only while a BBj file is selected; immediate check on gate-open | plain-Java unit test over the new gate / classification seam | `./gradlew test --tests "*PollGate*"` | ❌ W0 | ⬜ pending |
| pending | TBD | TBD | IOP-03 (#587) | T-95 spoofing | "Connected" requires a protocol-confirmed peer, never a bare TCP handshake | **socket-backed plain-JUnit integration test** (the probe is `com.intellij`-free) | `./gradlew test --tests "*InteropProbe*"` | ❌ W0 | ⬜ pending |
| pending | TBD | TBD | IOP-04 (#594) | — | Exactly one named `5008` constant; UI placeholder, persisted default and changed-from-default check cannot drift | source guard (extend `EffectiveInteropPortSourceGuardTest` or add a sibling) | `./gradlew test --tests "*EffectiveInteropPortSourceGuardTest*"` | ✅ extend | ⬜ pending |
| pending | TBD | TBD | IOP-05 (#620) | — | Both widgets/factories share one base; show, hide, update and tooltip unchanged | source guard re-point (D-16) + hand UAT for visual behavior | `./gradlew test --tests "*BbjStatusBarWidgetSourceGuardTest*"` | ✅ re-point | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**IOP-03 is the highest-value new test in this phase.** It was expected to be hand-UAT-only and is
not: a plain JUnit test stands up throwaway servers on ephemeral ports — one speaking the real
`Launcher` / `@JsonRequest getTopLevelPackages` protocol via a minimal local stub (must classify as
connected), one that accepts and then stays silent or replies with a well-formed-but-wrong shape
(must classify as the new wrong-peer state), and optionally one with nothing listening at all (must
classify as disconnected). That exercises the actual network and protocol path end-to-end without
an IDE.

---

## Wave 0 Requirements

- [ ] New source guard for `BbjJavaInteropService`'s disposal checks (IOP-01) — no existing guard covers `project.isDisposed()` in this file
- [ ] New poll-gate / status-classification plain-Java class(es) plus their JUnit tests (IOP-02)
- [ ] New LSP4J probe class plus its socket-backed JUnit tests, including both throwaway local-server fixtures (IOP-03)
- [ ] Single-occurrence `5008` assertion across `src/main/java` (IOP-04) — **must account for all four `BbjSettingsComponent.java` sites (189, 195, 461, 466)**, not the three CONTEXT.md D-12 enumerated; `:195` is a prose comment, so comment-stripping is load-bearing
- [ ] Re-pointed `BbjStatusBarWidgetSourceGuardTest` for the base-extraction shape (IOP-05, D-16), plus an edited `Lsp4ijImportAllowlistTest` map if `ServerStatus` moves onto the new base

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A foreign process squatting on the configured port reports the wrong-peer state, and the editor banner stops telling the user to start an already-running service | IOP-03 (#587), criterion 3 | The socket test covers classification; this confirms the rendered status text, tooltip and banner wording in a live IDE against a real squatter | On the maintainer's machine BBjServices squats on :5008 without speaking the interop protocol. Open a `.bbj` file: the Java widget must show the wrong-peer text with its tooltip, not "Java: Connected", and the banner must name the port collision |
| Both status-bar widgets show, hide, update and tooltip exactly as before | IOP-05 (#620), criterion 5 | No live IntelliJ UI test coverage exists in CI; the guard pins structure, not rendering | With a `.bbj` file selected both widgets visible; on a `BBx Config` file and a non-BBj tab both hidden **on the click itself** (v4.3 RESP-09); exercise every popup-menu item in both; confirm the Java widget's new tooltip (D-14, intended change) |
| The `CHECKING` transition does not read as flicker | IOP-02 (#593) / D-09 | Perceptual, per-tick timing in a running IDE | Watch the Java widget across several poll ticks with the service up, then stopped; the in-flight `CHECKING` state must be legible, not a strobe |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency bounded by one targeted Gradle run per task
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
