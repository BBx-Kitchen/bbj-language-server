---
phase: "96"
slug: "platform-integration-node-js-diagnosis"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-19"
---

# Phase 96 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `96-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 (Jupiter), via the Gradle `test` task |
| **Config file** | `bbj-intellij/build.gradle.kts` (JUnit Platform configured inline; no separate `junit-platform.properties`) |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.lsp.NodeExecutableResolverTest"` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --rerun-tasks` |
| **Estimated runtime** | Not measured this session. Suite is ~865 tests; `--rerun-tasks` is mandatory per the Phase 94 decision, because a `Task :test UP-TO-DATE` no-op otherwise masks a stale green. |

**No live IntelliJ UI test coverage exists in CI.** This project's verification pattern is:
plain-Java decision seams with no `com.intellij` import driven by plain JUnit 5; whole-file source
guards pinning IDE-only wiring by comment-stripped literal counts; and hand UAT in a running IDE per
phase. Plans must not assume an IDE fixture is available.

---

## Sampling Rate

- **After every task commit:** the quick run command above, scoped to the class the task touched.
- **After every plan wave:** `./gradlew test --rerun-tasks`.
- **Before `/gsd-verify-work`:** full suite green. The standing project gate is project-wide
  `numFailedTests: 0` plus deterministic targeted-file runs — **not** a failing-suite identity delta.
- **Max feedback latency:** bounded by the single-class quick run (unmeasured; single-class Gradle
  runs in this project are seconds, not minutes, once the daemon is warm).

---

## Per-Task Verification Map

Task IDs do not exist yet — this file is seeded before `gsd-planner` runs. Rows are keyed by
requirement; the planner fills `Task ID` / `Plan` / `Wave` when plans are authored.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | PLAT-01 | V12 File/Resources | Sweep is scoped to the plugin's own `textmate-bbj` prefix under a config-scoped temp path; delete failures log and continue rather than throw | unit (`@TempDir`, mirroring `NodeInstallPipelineTest`) | `./gradlew test --tests "*.BbjTextMateBundleProviderTest"` *(name provisional)* | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PLAT-02 | — | N/A | manual-only (D-03: hand UAT, no absence guard) | none required | N/A | ⬜ pending |
| TBD | TBD | TBD | PLAT-03 | — | All four banners keep their intended appear/disappear conditions, including the two intended changes | source guards + manual UAT | `./gradlew test --tests "*.BbjServerServiceRestartSourceGuardTest" --tests "*.Lsp4ijImportAllowlistTest"` | Partial | ⬜ pending |
| TBD | TBD | TBD | PLAT-04 | V5 Input Validation | Cache-inaccessible is a distinct `Reason`, never collapsed into "not cached" | unit | `./gradlew test --tests "*.NodeExecutableResolverTest"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PLAT-05 | V5 Input Validation | An unusable configured path falls through to detected/cached rather than dead-ending | unit | `./gradlew test --tests "*.NodeExecutableResolverTest"` | Partial | ⬜ pending |
| TBD | TBD | TBD | PLAT-06 | V10 Supply Chain | Digest-verified archive; exact `node.exe` entry match | **manual-only — no Linux-hosted run can close this** | none (by construction) | N/A | ⬜ pending |
| TBD | TBD | TBD | PLAT-06 (WR-02) | — | A failed temp cleanup never masks the pipeline's real exception | unit | `./gradlew test --tests "*.NodeInstallPipelineTest"` | ✅ | ⬜ pending |
| TBD | TBD | TBD | PLAT-06 (WR-04) | V10 Supply Chain | `.zip` branch matches `node.exe` exactly, not by suffix | unit (committed fixture `fake-node-win.zip`) | `./gradlew test --tests "*.NodeInstallPipelineTest"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] **A plain-Java seam for the TextMate bundle cache** — `BbjTextMateBundleProvider` currently
      carries `com.intellij` imports (`PathManager`, the `TextMateBundleProvider` interface), so it
      cannot be driven by plain JUnit as-is. Extract the cache decision (injectable `Path` roots plus a
      version/digest key) into a `com.intellij`-free class with the platform class as a thin wrapper,
      matching `NodeExecutableResolver` / `NodeAvailability` / `BbjFileVisibility`. Then add its test
      class. Covers PLAT-01.
- [ ] **New `NodeExecutableResolverTest` cases** for the version-check overload and the new `Reason`
      constant — a version-based fall-through case mirroring the existing missing-path fall-through at
      `NodeExecutableResolverTest.java:342-362`. Covers PLAT-04 and PLAT-05.
- [ ] **Framework install:** none — JUnit 5 is already wired.

*Note: `BbjTextMateBundleProvider` has no existing test or source guard; `plugin.xml:213-214` and the
file itself are its only references.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Settings › Editor › Color Scheme has no BBj node | PLAT-02 | D-03 chose UAT over an absence guard, deliberately leaving the deferred semantic-token route unblocked | Open Settings › Editor › Color Scheme in a running IDE with the phase build installed; confirm no BBj entry |
| All four banners appear/disappear correctly | PLAT-03 | Banner rendering has no headless fixture; source guards pin the wiring, not the visual result | On a `.bbj` file trigger each of: missing BBj home, missing/unusable Node, server crashed, java-interop unavailable. Then confirm the two intended changes: crash banner now shows on `.bbx`, no longer on `.bbl` |
| Crash banner appears during indexing | PLAT-03 (D-10) | Dumb-mode behavior needs a real indexing pass | Trigger a re-index with the server in crashed state; confirm the banner renders |
| Node.js auto-install end-to-end | PLAT-06 | No Linux-hosted run can exercise the Windows filesystem/ACL/network path | On real Windows with no Node configured: open a BBj file, use the banner's "Download Node.js", confirm a working `node.exe` beside its `.sha256` in `bbj-intellij-data/nodejs` and that the LS starts. On failure capture `idea.log` + directory contents and record a `WINDOWS.md` entry (D-15) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency measured and recorded
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
