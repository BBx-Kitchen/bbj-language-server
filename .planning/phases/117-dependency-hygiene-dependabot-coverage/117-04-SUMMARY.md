---
phase: 117-dependency-hygiene-dependabot-coverage
plan: "04"
subsystem: java-interop
tags: [guava, dependency-hygiene, cve, socket-service, gradle]

requires:
  - phase: 116-java-interop-test-coverage
    provides: the interop test harness (loopback JSON-RPC scaffold, cases, gate) used as the live smoke driver
provides:
  - "java-interop's SocketServiceApp accepts an optional, validated port argument (1-65535, default 5008), so the interop service can be smoke-tested next to a running BBjServices instance without touching :5008"
  - "java-interop runs on Guava 33.7.1-jre, the same release bbj-ls ships in production, closing CVE-2023-2976 and CVE-2020-8908"
affects: []

actuals:
  tokens: 734
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Java CLI argument validation exits with a usage line to stderr and status 2 before any side effect (socket bind), mirroring the harness's own --port default convention"

key-files:
  created: []
  modified:
    - java-interop/src/main/java/bbj/interop/SocketServiceApp.java
    - java-interop/build.gradle

key-decisions:
  - "Per D-12, the port argument is read from argv (not a -D system property); the Gradle application start script and `./gradlew run --args=` both pass argv through unchanged"
  - "Per D-05, only the single Guava version-string line changed in build.gradle; no call-site rewrite in InteropService.java (Stopwatch/Lists/Primitives/ClassPath all remained source-stable across 31.1 to 33.7.1)"
  - "Per D-06/D-07, the smoke test used the existing 17-case interop harness on a scratch port (15008) with a before/after case-line comparison as the gate, not harness exit 0 alone; bbj-ls already pins 33.7.1-jre so no follow-up there is needed"

requirements-completed: [DEP-04]

coverage:
  - id: D1
    description: "SocketServiceApp accepts an optional validated port argument (default 5008, localhost-only bind); invalid input exits 2 with a usage line before binding"
    requirement: DEP-04
    verification:
      - kind: other
        ref: "gradlew build installDist (BUILD SUCCESSFUL)"
        status: pass
      - kind: manual_procedural
        ref: "four bad-argument runtime checks (abc, 0, 70000, two-argument case) each exit 2 with a Usage line"
        status: pass
      - kind: manual_procedural
        ref: "live smoke on 15008: Connecting... OK, 17/17 passed, 127.0.0.1-only bind, listener cleared after run"
        status: pass
    human_judgment: false
  - id: D2
    description: "java-interop builds and runs on Guava 33.7.1-jre with identical harness results to the 31.1-jre baseline, and OSV confirms no advisory for the new coordinate"
    requirement: DEP-04
    verification:
      - kind: other
        ref: "gradlew build installDist (BUILD SUCCESSFUL) after the bump"
        status: pass
      - kind: other
        ref: "resolved runtime classpath and installed lib/ contain guava-33.7.1-jre.jar only, no 31.1-jre"
        status: pass
      - kind: other
        ref: "OSV query pkg:maven/com.google.guava/guava@33.7.1-jre returns {} ; @31.1-jre returns both target CVEs (live positive control)"
        status: pass
      - kind: manual_procedural
        ref: "live smoke on 15008 after the bump: case and Results lines byte-identical to the 31.1-jre baseline (diff exit 0)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-28
status: complete
---

# Phase 117 Plan 04: java-interop port argument and Guava 33.7.1-jre bump Summary

**SocketServiceApp gained a validated optional port argument for D-06's smoke test, and java-interop now runs on Guava 33.7.1-jre — the same release bbj-ls ships in production — with a live before/after harness comparison proving nothing regressed.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-09-28T16:51:37Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `SocketServiceApp.java` accepts an optional single port argument (1-65535); no argument keeps the existing `localhost:5008` default, and invalid input (non-numeric, 0, above 65535, or more than one argument) exits 2 with a usage line before any socket bind
- `java-interop/build.gradle` bumped from `com.google.guava:guava:31.1-jre` to `33.7.1-jre` — the resolved runtime classpath and installed `lib/` directory carry only the new coordinate
- A live class lookup over the socket (17/17 interop-harness cases) on port 15008 proved byte-identical (case lines and Results line) before and after the Guava bump
- OSV confirmed CVE-2023-2976 and CVE-2020-8908 both affect 31.1-jre (live positive control) and neither affects 33.7.1-jre

## Task Commits

1. **Task 1: java-interop starts on a chosen free port and answers a class lookup over the socket (baseline on Guava 31.1-jre)** - `12670d78` (feat)
2. **Task 2: java-interop builds and runs on Guava 33.7.1-jre with identical harness results, and OSV finds no advisory for it** - `65a2b679` (build)

## Files Created/Modified
- `java-interop/src/main/java/bbj/interop/SocketServiceApp.java` - adds `DEFAULT_PORT`, a `port` field, two constructors, `parsePort(String[])`, and the usage/exit-2 validation path; `run()` binds `InetSocketAddress("localhost", port)` instead of the hard-coded 5008
- `java-interop/build.gradle` - single-line Guava version bump, `31.1-jre` → `33.7.1-jre`

## Decisions Made
- Read the port from argv per D-12, not a `-D` system property — the Gradle application start script and `./gradlew run --args=` both pass argv through unmodified
- Kept the Guava bump to the one dependency line; `InteropService.java`'s four call sites (`Stopwatch`, `Lists`, `Primitives`, `ClassPath`) needed no changes, confirmed by a clean `compileJava`
- Used the before/after case-line comparison as the D-06 gate rather than requiring harness exit 0 — the plan anticipated case 14 (`com.basis.startup.type`) would fail against java-interop's non-BBj classpath; in practice all 17 cases passed on both runs (java-interop's `getClassInfos` returns an empty-but-well-formed result for a package it has no classes in, which the harness scores as a pass, not a failure) — recorded here since it differs from the plan's stated expectation, though it does not change the pass/fail outcome
- Confirmed bbj-ls already pins `33.7.1-jre` (`/home/coder/repos/bbj-ls/bbj-ls/pom.xml:88-91`, sibling repo, read-only) — no bbj-ls follow-up needed (D-07)

## Deviations from Plan

None - plan executed exactly as written. The harness result difference from the plan's stated expectation (all 17 cases passed instead of case 14 failing) is a factual outcome, not a deviation from the plan's instructions — the plan's own gate was "before/after identity," which held, and the plan explicitly named this as a planning-time assumption rather than a requirement.

## Issues Encountered

None. Both Gradle builds (via `bbj-intellij`'s pinned wrapper, `-p java-interop`) succeeded on the first attempt; both live smoke runs connected on the first try with no port conflicts.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DEP-04 (#521) is complete: java-interop runs on a Guava release neither CVE-2023-2976 nor CVE-2020-8908 affects, proven by a live before/after harness comparison plus a live OSV positive control.
- `README.md` line 28's `./gradlew run` hint for the `java-interop` subfolder does not work in a fresh clone (the wrapper directory is gitignored) — observed during this plan, not fixed here, per the plan's explicit scope note.
- 15008 is free again; BBjServices on :5008 was never touched. Ready for the next phase-117 plan.

---
*Phase: 117-dependency-hygiene-dependabot-coverage*
*Completed: 2026-09-28*
