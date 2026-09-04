---
phase: 78-build-test-foundation
plan: 01
subsystem: infra
tags: [gradle, jdk-toolchain, daemon-jvm, foojay, intellij-plugin]

requires: []
provides:
  - "Gradle daemon steered onto JDK 17 via committed Daemon JVM criteria (gradle-daemon-jvm.properties), independent of the host's default JVM"
  - "Compile/test JVM pinned to JDK 17 through the Gradle toolchain block in bbj-intellij/build.gradle.kts"
  - "foojay resolver applied so a host with no local JDK 17 can self-provision one; proven end-to-end with a real download"
affects: [78-02, 78-03, 79, 80, 81, 82, 83]

actuals:
  tokens: 20000
  tasks: 3
  commits: 3

tech-stack:
  added: ["org.gradle.toolchains.foojay-resolver-convention 1.0.0"]
  patterns: ["Gradle Daemon JVM criteria file (gradle/gradle-daemon-jvm.properties)", "java.toolchain block mirroring java-interop/build.gradle"]

key-files:
  created:
    - bbj-intellij/gradle/gradle-daemon-jvm.properties
    - .planning/phases/78-build-test-foundation/78-PROVISIONING-PROOF.txt
  modified:
    - bbj-intellij/build.gradle.kts
    - bbj-intellij/settings.gradle.kts

key-decisions:
  - "D-01/D-02/D-03 followed exactly: hand-wrote toolchainVersion=17 first (Task 1) so the daemon could bootstrap on JDK 25, then regenerated the file with updateDaemonJvm (Task 2) to add download URLs — bootstrap ordering worked as designed."
  - "No JDK vendor pinned in the criteria file, so an already-installed JDK 17 is preferred; the self-heal path (Task 3) was only reached by explicitly disabling local detection."
  - "D-17 self-heal proof exceeded the 'best effort' bar: egress to api.foojay.io was available in this sandbox, so the download path was proven with a real Eclipse Temurin 17.0.20.1 archive, not just documented as blocked."

requirements-completed: [BUILD-01]

coverage:
  - id: D1
    description: "./gradlew --offline -q tasks succeeds on the host's default JDK 25 with no manual JDK switching (#570 regression check)"
    requirement: "BUILD-01"
    verification:
      - kind: other
        ref: "cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew --offline -q tasks (exit 0, no 'What went wrong')"
        status: pass
    human_judgment: false
  - id: D2
    description: "Compile/test JVM pinned to JDK 17 via toolchain block, mirroring java-interop/build.gradle"
    requirement: "BUILD-01"
    verification:
      - kind: other
        ref: "grep 'JavaLanguageVersion.of(17)' bbj-intellij/build.gradle.kts"
        status: pass
    human_judgment: false
  - id: D3
    description: "foojay resolver applied and daemon JVM criteria carry vendor-neutral download URLs for self-heal provisioning"
    requirement: "BUILD-01"
    verification:
      - kind: other
        ref: "cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew -q tasks (exit 0 with foojay plugin applied); grep -c '^toolchainUrl\\.' gradle-daemon-jvm.properties == 10"
        status: pass
    human_judgment: false
  - id: D4
    description: "Full JUnit suite (96 tests / 7 classes) passes on JDK 25 host with no JDK override"
    requirement: "BUILD-01"
    verification:
      - kind: other
        ref: "cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test (BUILD SUCCESSFUL, 96 tests, 0 failures)"
        status: pass
    human_judgment: false
  - id: D5
    description: "D-17 self-heal provisioning path demonstrated: JDK 17 downloaded via generated toolchainUrl when local detection is disabled"
    requirement: "BUILD-01"
    verification:
      - kind: other
        ref: ".planning/phases/78-build-test-foundation/78-PROVISIONING-PROOF.txt (records command, output, exit code, downloaded archive evidence)"
        status: pass
    human_judgment: false

duration: 17min
completed: 2026-09-04
status: complete
---

# Phase 78 Plan 01: Build & Test Foundation — Daemon JVM Toolchain Summary

**Gradle daemon and compile/test JVM steered onto JDK 17 via committed Daemon JVM criteria and a toolchain block, with foojay self-provisioning proven by an actual JDK download — `bbj-intellij` now builds and tests on this host's default Temurin 25.0.4.1 with zero manual JDK switching.**

## Performance

- **Duration:** ~17 min
- **Started:** ~2026-09-04T05:34:00Z
- **Completed:** 2026-09-04T05:51:11Z
- **Tasks:** 3
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Created `bbj-intellij/gradle/gradle-daemon-jvm.properties` (Gradle Daemon JVM criteria, `toolchainVersion=17`) so the daemon itself launches on JDK 17 regardless of the JVM that invoked `gradlew` — this is the layer that actually fixes #570, since the failure happens inside the daemon's embedded Kotlin DSL compiler before `build.gradle.kts` is even evaluated.
- Added a `java.toolchain { languageVersion = JavaLanguageVersion.of(17) }` block to `bbj-intellij/build.gradle.kts`, mirroring `java-interop/build.gradle`, so the compile/test JVM is pinned independent of the daemon.
- Applied `org.gradle.toolchains.foojay-resolver-convention` version `1.0.0` in `bbj-intellij/settings.gradle.kts` and regenerated the criteria file via `updateDaemonJvm --jvm-version=17`, adding 10 `toolchainUrl.<OS>.<ARCH>` entries (all `api.foojay.io` Disco API redirects) — no vendor pinned, so an already-installed JDK 17 is always preferred over a download.
- Ran the full JUnit suite (`./gradlew test`) on the JDK 25 host: **BUILD SUCCESSFUL, 96 tests across 7 top-level classes (9 report files counting 2 nested inner classes), 0 failures, 0 errors, 0 skipped.**
- Proved the D-17 self-heal path is not merely reachable in theory: with local JDK auto-detection disabled and installation-path hints emptied, Gradle actually downloaded and installed a real **Eclipse Temurin 17.0.20.1** JDK for linux-x64 from the generated `toolchainUrl.LINUX.X86_64` entry, then successfully ran `tasks` on it. Evidence (archive + extracted toolchain dir under `~/.gradle/jdks/`) is captured in `78-PROVISIONING-PROOF.txt`.
- Re-confirmed `./gradlew --offline -q tasks` still exits 0 after both proofs — the primary criterion holds under normal conditions, not just the provisioning-forced path.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end — `./gradlew tasks` succeeds on the JDK 25 host** (tracer) — `40f8269` (feat)
2. **Task 2: Apply the foojay resolver and regenerate the criteria with download URLs** — `74fa0a0` (feat)
3. **Task 3: Prove `./gradlew test` on JDK 25 and record the self-heal provisioning attempt** — `20605c5` (test)

**Plan metadata:** commit pending (this commit — SUMMARY + state updates)

## Command Results (exit codes)

| # | Command | Exit | Notes |
|---|---------|------|-------|
| 1 | `JAVA_HOME=/opt/java/default ./gradlew --offline -q tasks` (before fix) | 0 (BUILD FAILED) | Baseline reproduction: `What went wrong: 25.0.4.1` |
| 2 | `JAVA_HOME=/opt/java/default ./gradlew --offline -q tasks` (Task 1) | 0 | Full task list printed, no `What went wrong` |
| 3 | `JAVA_HOME=/opt/java/default ./gradlew -q tasks` (Task 2, foojay applied) | 0 | Full task list printed |
| 4 | `JAVA_HOME=/opt/java/default ./gradlew test` (Task 3) | 0 | `BUILD SUCCESSFUL`, 96 tests, 0 failures |
| 5 | `JAVA_HOME=/opt/java/default ./gradlew tasks -Porg.gradle.java.installations.auto-detect=false -Porg.gradle.java.installations.paths=` (D-17 proof) | 0 | Downloaded and installed Temurin 17.0.20.1 |
| 6 | `JAVA_HOME=/opt/java/default ./gradlew --offline -q tasks` (final re-confirm) | 0 | Still clean after both proofs |

## Generated `toolchainUrl` Keys

All 10 entries generated by `updateDaemonJvm --jvm-version=17`, all pointing at the **`api.foojay.io`** Disco API redirect service (no vendor pinned):

```
toolchainUrl.FREE_BSD.AARCH64=https://api.foojay.io/disco/v3.0/ids/65c654f29b9eb65a9f970de37f9e9b63/redirect
toolchainUrl.FREE_BSD.X86_64=https://api.foojay.io/disco/v3.0/ids/a07958869a3c7133fd4b10c5eda83472/redirect
toolchainUrl.LINUX.AARCH64=https://api.foojay.io/disco/v3.0/ids/65c654f29b9eb65a9f970de37f9e9b63/redirect
toolchainUrl.LINUX.X86_64=https://api.foojay.io/disco/v3.0/ids/a07958869a3c7133fd4b10c5eda83472/redirect
toolchainUrl.MAC_OS.AARCH64=https://api.foojay.io/disco/v3.0/ids/204f0dc4ae86bb7172e0e5fec2aae6fb/redirect
toolchainUrl.MAC_OS.X86_64=https://api.foojay.io/disco/v3.0/ids/00d5230ba27fb94fafe62c630104eb6b/redirect
toolchainUrl.UNIX.AARCH64=https://api.foojay.io/disco/v3.0/ids/65c654f29b9eb65a9f970de37f9e9b63/redirect
toolchainUrl.UNIX.X86_64=https://api.foojay.io/disco/v3.0/ids/a07958869a3c7133fd4b10c5eda83472/redirect
toolchainUrl.WINDOWS.AARCH64=https://api.foojay.io/disco/v3.0/ids/59c4d289838e9b34cc46a2ec3baa0e12/redirect
toolchainUrl.WINDOWS.X86_64=https://api.foojay.io/disco/v3.0/ids/c9869437c9afb245b55b746fc0c53348/redirect
```

The Linux x86_64 entry (relevant to this host) resolved to **Eclipse Temurin 17.0.20.1** when actually downloaded in the D-17 proof.

## JUnit Test/Class Counts

- **7 top-level test classes**, 96 tests total, 0 failures, 0 errors, 0 skipped.
- Breakdown by report file (2 files are nested inner classes of `NodeArchiveVerifierTest` and `NodeExecutableResolverTest`):
  - `BbjLanguageServerSourceGuardTest` — 4
  - `BbjNodeDownloaderSourceGuardTest` — 7
  - `BbjProcessSecretEnvTest` — 23
  - `BbjSecretArgvSourceGuardTest` — 12
  - `NodeArchiveVerifierTest` — 8 (+ `$ProductionConstants` — 5)
  - `NodeExecutableResolverTest` — 21 (+ `$RealFilesystemBehavior` — 6)
  - `NodeInstallIntegrityTest` — 10

## D-17 Outcome

**Provisioned JDK 17 from `https://api.foojay.io/disco/v3.0/ids/a07958869a3c7133fd4b10c5eda83472/redirect`** (Eclipse Temurin 17.0.20.1, linux-x64). Egress to both `plugins.gradle.org` (foojay plugin resolution, Task 2) and `api.foojay.io` (JDK download, Task 3) was available in this execution sandbox, so the self-heal path was demonstrated with a genuine download rather than only documented as blocked. Full transcript, command line, and download evidence recorded in `.planning/phases/78-build-test-foundation/78-PROVISIONING-PROOF.txt`.

## Files Created/Modified

- `bbj-intellij/gradle/gradle-daemon-jvm.properties` — new, tracked; Gradle Daemon JVM criteria (`toolchainVersion=17` + 10 `toolchainUrl.` entries)
- `bbj-intellij/build.gradle.kts` — added `toolchain { languageVersion = JavaLanguageVersion.of(17) }` inside the existing `java {}` block; `sourceCompatibility`/`targetCompatibility` lines kept unchanged
- `bbj-intellij/settings.gradle.kts` — added `id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"` alongside the existing IntelliJ platform settings plugin
- `.planning/phases/78-build-test-foundation/78-PROVISIONING-PROOF.txt` — new; D-17 self-heal transcript and evidence

## Decisions Made

- Followed the plan's bootstrap ordering exactly (D-03): hand-wrote `toolchainVersion=17` in Task 1 before any daemon existed that could run `updateDaemonJvm`, then regenerated the file in Task 2 once the daemon could already start on JDK 25 via the criteria from Task 1.
- Did not pin a vendor in the criteria file (D-02), matching the requirement that an already-installed JDK 17 always wins over a download.
- Treated D-17 as provable rather than merely attemptable: since egress was available, ran the proof to completion and captured the actual downloaded-JDK evidence rather than stopping at "attempted."

## Deviations from Plan

None — plan executed exactly as written. All three tasks' `<verify>` and `<acceptance_criteria>` passed on the first attempt with no auto-fixes required.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. (Network egress to `plugins.gradle.org` and `api.foojay.io` was available in this environment; if a future CI or developer environment blocks that egress, the already-installed-JDK path via `~/.gradle/gradle.properties` installation hints or CI's `setup-java` step still satisfies the criteria without any download.)

## Next Phase Readiness

- BUILD-01 (#570) is closed: `bbj-intellij` builds and tests on this host's default JDK 25 with zero manual JDK switching, and the committed repository alone (no machine-local `~/.gradle/gradle.properties` dependency) satisfies the criterion.
- Every subsequent `./gradlew` invocation in phases 78-83 can now run directly with `JAVA_HOME=/opt/java/default` (or no `JAVA_HOME` override at all) — the gate this phase existed to clear is open.
- Ready for `78-02` (Gradle wrapper regeneration to 8.14.5 + Dependabot entry), which explicitly depends on this plan's daemon/toolchain fix landing first (D-04).

---
*Phase: 78-build-test-foundation*
*Completed: 2026-09-04*
