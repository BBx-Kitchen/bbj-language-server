---
phase: 78-build-test-foundation
plan: 02
subsystem: infra
tags: [gradle, wrapper, checksum, dependabot, supply-chain, intellij-plugin]

requires:
  - phase: 78-build-test-foundation
    provides: "Gradle daemon steered onto JDK 17 via committed Daemon JVM criteria (plan 78-01) — the daemon this plan's wrapper regeneration and every build proof depend on"
provides:
  - "Gradle wrapper regenerated to 8.14.5 (latest 8.x), checksum-pinned via distributionSha256Sum, verified byte-for-byte against services.gradle.org at execution time"
  - "Weekly Dependabot surveillance of the /bbj-intellij gradle ecosystem, with the hygiene-gate interaction documented in a YAML comment"
  - "Enumerated transitive dependency tree (compileClasspath, runtimeClasspath, testRuntimeClasspath) as closing evidence for #576"
  - "Proof that intellij-platform-gradle-plugin 2.11.0 and the full JUnit suite work unmodified on the 8.14.5 wrapper"
affects: [78-03, 79, 80, 81, 82, 83]

actuals:
  tokens: 42000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: ["wrapper task run twice (rewrite properties, then regenerate jar/gradlew under the new distribution)", "publisher checksum fetched live via curl -sSL rather than trusted from a planning doc"]

key-files:
  created:
    - .planning/phases/78-build-test-foundation/78-DEPENDENCIES.txt
  modified:
    - bbj-intellij/gradle/wrapper/gradle-wrapper.properties
    - bbj-intellij/gradle/wrapper/gradle-wrapper.jar
    - bbj-intellij/gradlew
    - bbj-intellij/gradlew.bat
    - .github/dependabot.yml

key-decisions:
  - "D-04/D-05 followed exactly: wrapper task run twice (first rewrites properties, second executes under 8.14.5 itself and regenerates jar/gradlew/gradlew.bat), then both checksums fetched live from services.gradle.org and compared byte-for-byte before committing."
  - "D-08 discretion resolved as the plan specified: no ignore: block on the new gradle Dependabot stanza — wrapper-version bumps flow through, and workflow-hygiene.yml's red check on unrecorded checksums is the intended friction, documented in a YAML comment above the stanza."
  - "buildPlugin initially failed at buildSearchableOptions with 'Fontconfig head is null' — the host was missing the fontconfig and libfreetype6 system packages entirely (unrelated to the Gradle/plugin version bump). Installed both via apt (Rule 3 blocking-issue auto-fix); buildPlugin then succeeded with BUILD SUCCESSFUL, 96 tests, 0 failures, confirming D-06's compatibility proof cleanly rather than surfacing a plugin regression."

requirements-completed: [BUILD-02]

coverage:
  - id: D1
    description: "gradle-wrapper.properties declares Gradle 8.14.5 with distributionSha256Sum pinned to the published bin.zip checksum, networkTimeout=10000, and validateDistributionUrl=true preserved"
    requirement: "BUILD-02"
    verification:
      - kind: other
        ref: "grep checks against gradle-wrapper.properties (all four fields) — exit 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "Committed gradle-wrapper.jar SHA-256 equals the publisher's gradle-8.14.5-wrapper.jar.sha256, fetched live"
    requirement: "BUILD-02"
    verification:
      - kind: other
        ref: "test \"$(curl -sSL https://services.gradle.org/distributions/gradle-8.14.5-wrapper.jar.sha256)\" = \"$(sha256sum gradle-wrapper.jar | cut -d' ' -f1)\" — exit 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "distributionSha256Sum equals the publisher's gradle-8.14.5-bin.zip.sha256, fetched live"
    requirement: "BUILD-02"
    verification:
      - kind: other
        ref: "test \"$(curl -sSL .../gradle-8.14.5-bin.zip.sha256)\" = \"$(grep distributionSha256Sum= gradle-wrapper.properties | cut -d= -f2)\" — exit 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "All four wrapper files regenerated together by the wrapper task, none hand-edited; no CI workflow files touched"
    requirement: "BUILD-02"
    verification:
      - kind: other
        ref: "git status --porcelain gradle-wrapper.jar gradlew gradlew.bat | wc -l == 3; git diff --name-only .github/workflows == empty"
        status: pass
    human_judgment: false
  - id: D5
    description: "node bbj-vscode/tools/check-gradle-wrapper.mjs reports 0 findings against the bumped wrapper"
    requirement: "BUILD-02"
    verification:
      - kind: other
        ref: "node bbj-vscode/tools/check-gradle-wrapper.mjs → '1 wrapper(s), 7 workflow file(s), 3 Gradle job(s), 0 findings.' exit 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "Weekly gradle Dependabot stanza added for /bbj-intellij, npm stanza and its ignore entries unchanged"
    requirement: "BUILD-02"
    verification:
      - kind: other
        ref: "grep checks against .github/dependabot.yml for both package-ecosystem stanzas — exit 0"
        status: pass
    human_judgment: false
  - id: D7
    description: "Transitive dependency tree enumerated (compileClasspath, runtimeClasspath, testRuntimeClasspath) and captured to 78-DEPENDENCIES.txt, naming ideaIC 2024.2, LSP4IJ 0.19.0, and JUnit BOM coordinates"
    requirement: "BUILD-02"
    verification:
      - kind: other
        ref: "JAVA_HOME=/opt/java/default ./gradlew dependencies --console=plain (exit 0); grep checks against 78-DEPENDENCIES.txt for all three configuration sections"
        status: pass
    human_judgment: false
  - id: D8
    description: "./gradlew buildPlugin (which depends on test) succeeds on 8.14.5 with intellij-platform-gradle-plugin 2.11.0 — no code or plugin-version changes needed"
    requirement: "BUILD-02"
    verification:
      - kind: other
        ref: "JAVA_HOME=/opt/java/default ./gradlew buildPlugin → BUILD SUCCESSFUL, 96 tests / 7 classes / 0 failures, 0 errors"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-04
status: complete
---

# Phase 78 Plan 02: Gradle Wrapper 8.14.5 Regeneration Summary

**`bbj-intellij`'s Gradle wrapper regenerated to checksum-pinned 8.14.5 with publisher-verified bytes, weekly Dependabot surveillance added, and the full transitive dependency tree enumerated — `buildPlugin` and 96 JUnit tests pass unmodified on `intellij-platform-gradle-plugin` 2.11.0.**

## Performance

- **Duration:** ~20 min
- **Started:** ~2026-09-04T05:52:00Z
- **Completed:** 2026-09-04T06:10:50Z
- **Tasks:** 3
- **Files modified:** 6 (5 modified, 1 created)

## Accomplishments

- Regenerated the wrapper quartet to Gradle **8.14.5** via the `wrapper` task run twice (never hand-edited): first run rewrote `gradle-wrapper.properties`, second run executed under 8.14.5 itself and regenerated `gradle-wrapper.jar`, `gradlew`, `gradlew.bat` together. `networkTimeout=10000` and `validateDistributionUrl=true` survived unchanged.
- Independently verified both checksums against `services.gradle.org` at execution time — both matched exactly, no drift from the plan's stale-research-corrected values.
- Added a `gradle` ecosystem Dependabot stanza for `/bbj-intellij` (weekly), deliberately without an `ignore:` block per D-08, with a YAML comment documenting the hygiene-gate interaction.
- Enumerated the full transitive dependency tree (`compileClasspath`, `runtimeClasspath`, `testRuntimeClasspath`) into `78-DEPENDENCIES.txt` — the closing evidence for #576.
- Proved `intellij-platform-gradle-plugin` 2.11.0 works unmodified on 8.14.5: `./gradlew buildPlugin` (which depends on `test`) succeeded with `BUILD SUCCESSFUL`, 96 tests across 7 classes, 0 failures.
- `node bbj-vscode/tools/check-gradle-wrapper.mjs` reports `0 findings.` against the bumped wrapper; no CI workflow file was touched.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end — regenerate the wrapper to 8.14.5 and drive a build with it** (tracer) — `f63604b` (feat)
2. **Task 2: Verify the wrapper against the publisher and add Dependabot surveillance** — `9b1d244` (feat)
3. **Task 3: Enumerate the transitive tree and prove plugin 2.11.0 on 8.14.5** — `e104b37` (docs)

**Plan metadata:** commit pending (this commit — SUMMARY + state updates)

## Command Results (exit codes)

| # | Command | Exit | Notes |
|---|---------|------|-------|
| 1 | `wrapper --gradle-version 8.14.5 --gradle-distribution-sha256-sum 6f74b601…8854` (run 1, under old 8.13 daemon) | 0 | Rewrote `gradle-wrapper.properties` only |
| 2 | `wrapper --gradle-version 8.14.5 --gradle-distribution-sha256-sum 6f74b601…8854` (run 2, under new 8.14.5 distribution, downloaded live) | 0 | Regenerated `gradle-wrapper.jar`, `gradlew`, `gradlew.bat` |
| 3 | `JAVA_HOME=/opt/java/default ./gradlew --offline -q tasks` (Task 1 tracer verify) | 0 | No `What went wrong`, no `25.0.4.1` |
| 4 | `node bbj-vscode/tools/check-gradle-wrapper.mjs` | 0 | `1 wrapper(s), 7 workflow file(s), 3 Gradle job(s), 0 findings.` |
| 5 | `JAVA_HOME=/opt/java/default ./gradlew dependencies --console=plain` | 0 | 289 lines captured to `78-DEPENDENCIES.txt` |
| 6 | `JAVA_HOME=/opt/java/default ./gradlew buildPlugin` (attempt 1) | 1 | `buildSearchableOptions` failed: `Fontconfig head is null` (missing system fontconfig/libfreetype6) |
| 7 | `JAVA_HOME=/opt/java/default ./gradlew buildPlugin` (attempt 2, after installing `libfreetype6`) | 1 | Same fontconfig failure — `libfreetype6` alone was insufficient |
| 8 | `JAVA_HOME=/opt/java/default ./gradlew buildPlugin` (attempt 3, after installing `fontconfig` + `fonts-dejavu-core`) | 0 | `BUILD SUCCESSFUL in 20s`, `test` ran, 96 tests / 0 failures |

## Checksum Verification (D-05)

| Artifact | Fetched (publisher, live) | Local (committed) | Match |
|---|---|---|---|
| `gradle-wrapper.jar` | `7d3a4ac4de1c32b59bc6a4eb8ecb8e612ccd0cf1ae1e99f66902da64df296172` (`gradle-8.14.5-wrapper.jar.sha256`) | `7d3a4ac4de1c32b59bc6a4eb8ecb8e612ccd0cf1ae1e99f66902da64df296172` (`sha256sum`) | ✓ exact |
| `distributionSha256Sum` | `6f74b601422d6d6fc4e1f9a1ab6522f642c2fdcbc15ae33ebd30ba3d7198e854` (`gradle-8.14.5-bin.zip.sha256`) | `6f74b601422d6d6fc4e1f9a1ab6522f642c2fdcbc15ae33ebd30ba3d7198e854` (`gradle-wrapper.properties`) | ✓ exact |

## `check-gradle-wrapper.mjs` final line

```
1 wrapper(s), 7 workflow file(s), 3 Gradle job(s), 0 findings.
```

## Dependency Tree / Build Proof (D-06, D-07)

- `./gradlew dependencies --console=plain` exit 0. `78-DEPENDENCIES.txt` opens with the exact command line and Gradle version (`8.14.5`), and contains `compileClasspath`, `runtimeClasspath`, `testRuntimeClasspath` sections. Confirmed present: `idea:ideaIC:2024.2` (14 occurrences across configs), `com.redhat.devtools.lsp4ij:0.19.0` (5 occurrences), and `org.junit:junit-bom:5.10.2` with its full jupiter/platform fan-out.
- `./gradlew buildPlugin` (depends on `test`) — exit 0, `BUILD SUCCESSFUL in 20s`. **JUnit: 96 tests, 7 top-level classes (9 report files counting 2 nested inner classes), 0 failures, 0 errors, 0 skipped** — identical counts to 78-01's proof on the pre-bump wrapper, confirming no regression from the 8.14.5 move.
- **`intellij-platform-gradle-plugin` 2.11.0 needed nothing to work on 8.14.5.** The initial `buildPlugin` failures were entirely a missing-system-package problem on this host (`fontconfig` and `libfreetype6` were not installed at all, so the headless `buildSearchableOptions` task's AWT font subsystem threw `Fontconfig head is null`) — unrelated to the Gradle or plugin version. No `build.gradle.kts`, `settings.gradle.kts`, or `src/` file was touched; `git status --porcelain` on all three confirms empty.

## Files Created/Modified

- `bbj-intellij/gradle/wrapper/gradle-wrapper.properties` — `distributionUrl` → `gradle-8.14.5-bin.zip`, `distributionSha256Sum` → `6f74b601…8854`
- `bbj-intellij/gradle/wrapper/gradle-wrapper.jar` — regenerated by the `wrapper` task under 8.14.5
- `bbj-intellij/gradlew`, `bbj-intellij/gradlew.bat` — regenerated together with the jar
- `.github/dependabot.yml` — new `gradle` ecosystem stanza for `/bbj-intellij`, weekly, with a comment documenting the D-08 hygiene-gate interaction; existing `npm` stanza and its `ignore:` entries unchanged
- `.planning/phases/78-build-test-foundation/78-DEPENDENCIES.txt` — new; enumerated transitive dependency tree, closing evidence for #576

## Decisions Made

- Followed D-04's exact two-run wrapper regeneration sequence; the first run (under the still-8.13 daemon) rewrote only the properties file, and the second run (which downloaded and executed under the new 8.14.5 distribution) regenerated the remaining three files — matching the plan's stated mechanism for why the checksum pin must be passed on both invocations.
- D-08's discretion point (ignore wrapper-version bumps or let them flow through) was resolved exactly as the plan specified: no `ignore:` block, with the hygiene-gate interaction documented in a YAML comment.
- Treated the `buildSearchableOptions` fontconfig failure as a Rule 3 blocking-issue auto-fix (missing OS packages, not a package-manager-install exclusion since `apt` system packages are outside the npm/pip/cargo carve-out) rather than an architectural or plugin-compatibility problem — installed `libfreetype6`, then `fontconfig` + `fonts-dejavu-core`, and re-ran until `buildPlugin` succeeded cleanly, confirming D-06's compatibility proof rather than being blocked by an unrelated host gap.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Host missing fontconfig and libfreetype6 system packages**
- **Found during:** Task 3 (`./gradlew buildPlugin` proof)
- **Issue:** `buildSearchableOptions` (a headless-IDE task that `buildPlugin` depends on transitively) failed with `java.lang.RuntimeException: Fontconfig head is null, check your fonts or fonts configuration`, itself following an initial `UnsatisfiedLinkError: libfreetype.so.6: cannot open shared object file`. The host had neither `libfreetype6` nor `fontconfig` installed at all — a pre-existing environment gap, not something introduced by the wrapper or plugin version.
- **Fix:** `sudo apt-get install -y libfreetype6` (insufficient alone), then `sudo apt-get install -y fontconfig fonts-dejavu-core`. No repository file was changed.
- **Files modified:** None (host-level package install only)
- **Verification:** `./gradlew buildPlugin` re-run after each install; succeeded on the third attempt with `BUILD SUCCESSFUL`, 96 tests, 0 failures.
- **Committed in:** N/A (no repo change to commit — host environment fix only)

---

**Total deviations:** 1 auto-fixed (1 blocking, host-environment package install)
**Impact on plan:** No repository files were affected beyond the plan's stated scope. The fix was required to complete D-06's compatibility proof and would recur on any bare-minimal host lacking desktop font libraries; it does not indicate an issue with the Gradle 8.14.5 wrapper or `intellij-platform-gradle-plugin` 2.11.0.

## Issues Encountered

None beyond the deviation above, which was fully resolved.

## User Setup Required

None — no external service configuration required. Network egress to `services.gradle.org` was available for both the wrapper distribution download and the live checksum verification.

## Next Phase Readiness

- BUILD-02 (#503, #576) is closed: the wrapper is on current, checksum-pinned, publisher-verified Gradle 8.14.5; the existing CI wrapper-validation guard (`wrapper-validation@v6` + `check-gradle-wrapper.mjs`) is untouched and green; the transitive tree is enumerable and captured; Dependabot now watches `/bbj-intellij` weekly.
- `intellij-platform-gradle-plugin` 2.11.0 is confirmed compatible with 8.14.5 — no plugin bump or wrapper downgrade was needed.
- Ready for `78-03` (fail-fast bundle check, BUILD-03 / #517), which builds on both 78-01's daemon fix and this plan's wrapper regeneration.

---
*Phase: 78-build-test-foundation*
*Completed: 2026-09-04*

## Self-Check: PASSED

- `bbj-intellij/gradle/wrapper/gradle-wrapper.properties` — FOUND
- `.planning/phases/78-build-test-foundation/78-DEPENDENCIES.txt` — FOUND
- `.github/dependabot.yml` — FOUND
- Commit `f63604b` (Task 1) — FOUND
- Commit `9b1d244` (Task 2) — FOUND
- Commit `e104b37` (Task 3) — FOUND
