---
phase: "94"
slug: "em-login-run-action-consolidation"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-18"
---

# Phase 94 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit Jupiter (JUnit 5), `junit-bom` 6.1.3 (`bbj-intellij/build.gradle.kts:39-41`) |
| **Config file** | `bbj-intellij/build.gradle.kts` — `tasks.test { useJUnitPlatform() }` (`:44-46`) |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.actions.*"` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` |
| **Estimated runtime** | Not measured this session — targeted single-class runs are seconds; the full `bbj-intellij` suite (865 tests at v4.3 close) is minutes. Measure on the first Wave 1 task commit and record here. |

**Scope note:** this phase touches no `bbj-vscode` code, so the vitest/language-server suite is out of
this phase's gate. Run it only if a plan unexpectedly widens beyond `bbj-intellij/`.

---

## Sampling Rate

- **After every task commit:** targeted `./gradlew test --tests "<affected guard/unit test class>"`
  for the file(s) that task's diff touches.
- **After every plan wave:** full IntelliJ-side suite —
  `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test`
- **Before `/gsd-verify-work`:** full `bbj-intellij` suite green at `numFailedTests: 0` (the standing
  project constraint in `.planning/STATE.md` Active Constraints), plus the hand UAT pass below.
- **Max feedback latency:** one targeted class run per task commit (seconds); never more than one
  wave without a full-suite run.

---

## Per-Task Verification Map

Task IDs are assigned by the planner; rows below are seeded per requirement and must be expanded to
one row per task once `94-*-PLAN.md` files exist.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD (planner) | TBD | TBD | EM-05 | — | N/A — path resolution only | unit (injected seam) | `./gradlew test --tests "*<NewToolScriptResolver>*Test"` | ❌ W0 | ⬜ pending |
| TBD (planner) | TBD | TBD | EM-03 | T-94 argv-secret | Token travels on the environment, never argv; owner-only temp file precedes handler construction | source guard (re-point) + unit | `./gradlew test --tests "*BbjSecretArgvSourceGuardTest" --tests "*EmTokenTrustWindowSourceGuardTest" --tests "*<NewValidationClass>*Test"` | Guards ✅ / unit ❌ W0 | ⬜ pending |
| TBD (planner) | TBD | TBD | EM-01 | T-94 temp-file-leak | Cleanup `finally` covers the entire launch, not just the read | source guard (ordering) | `./gradlew test --tests "*EmLoginCleanup*SourceGuardTest"` | ❌ W0 | ⬜ pending |
| TBD (planner) | TBD | TBD | EM-02 | — | UX gate only, not a security boundary | source guard (shape) | `./gradlew test --tests "*EmLoginEnablement*SourceGuardTest"` | ❌ W0 | ⬜ pending |
| TBD (planner) | TBD | TBD | EM-04 | — | N/A — no code change; evidence only | existing guards only (D-05) | `./gradlew test --tests "*EmTokenTrustWindowSourceGuardTest" --tests "*BbjRunActionConfigPathSourceGuardTest"` | ✅ both exist | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Test-class names marked `<...>` are Claude's discretion per `94-CONTEXT.md`; the planner fixes them.*

---

## Wave 0 Requirements

- [ ] New EM-01 guard test file — pins "cleanup covers the whole launch" (D-05's meaning), not merely
      that a `finally` exists
- [ ] New EM-02 guard test (own file, or folded into an existing action guard per discretion) —
      asserts `setEnabledAndVisible(` present and `ActionUpdateThread.BGT` declared, and a bare
      `setEnabled(` absent (D-02's substance, without pinning the boolean expression)
- [ ] New plain-JUnit-5 unit test for the EM-03 validation class — covers the trust-window and
      parameter-shape half (the subprocess-spawning half is Assumption A1 in RESEARCH.md)
- [ ] New plain-JUnit-5 unit test for the EM-05 tool-script path helper — "script present → path" and
      "script missing → null" against the injected seam, modeled on `BbjInteropPortCacheTest` /
      `BbjNodeVersionCacheTest`
- [x] No framework install needed — JUnit Jupiter is already wired via `build.gradle.kts:39-45`

---

## Manual-Only Verifications

No live IntelliJ UI test coverage exists in CI (standing structural gap since v4.1), so every
user-visible behavior below is hand-verified in a running IDE built from this phase's final tree —
and rebuilt again after any code-review fixes land.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Login to Enterprise Manager" enablement and visibility | EM-02 | Action presentation state is only observable in a live IDE | Open a project → Tools menu shows the item; close all projects → item is hidden (not greyed). **Called out as an intended change at UAT.** |
| EM login end-to-end | EM-01, EM-05 | Spawns the BBj interpreter against a real EM | Tools ▸ Login to Enterprise Manager → credentials → success dialog; token stored |
| BUI and DWC launch from all three entry points | EM-04, EM-03 | Toolbar/menu/keymap dispatch is IDE-only | Run a `.bbj` file as BUI and as DWC via editor context menu *and* `alt B` / `alt D`; both launch in the browser |
| Token re-prompt paths | EM-03 | Requires real token lifecycle | Run BUI with no stored token (login prompt); with an expired token (re-prompt); a second run inside 5 minutes (trust-window hit — no `em-validate-token.bbj` subprocess) |
| GUI run unchanged (control) | — | Regression control for the base-class edits | Run a `.bbj` file as GUI — must behave exactly as before |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency recorded after the first Wave 1 task commit
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
