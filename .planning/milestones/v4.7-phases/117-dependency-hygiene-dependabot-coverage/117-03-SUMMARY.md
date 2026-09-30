---
phase: 117-dependency-hygiene-dependabot-coverage
plan: "03"
subsystem: infra
tags: [sbom, cyclonedx, provenance, formatter, osv, jcommander, dependency-hygiene]

requires: []
provides:
  - "CycloneDX bom.json recording jcommander 1.71's coordinate, publisher, license and SHA-256"
  - "README.md next to the vendored JARs stating the same provenance in prose plus an advisory-check how-to"
  - "Two new vitest drift assertions tying bom.json and README.md to FORMATTER_ARTIFACT_PINS and the real bytes"
  - "A recorded OSV result (empty) for pkg:maven/com.beust/jcommander@1.71, with a live positive control"
affects: []

actuals:
  tokens: 3166
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "SBOM-as-static-file cross-checked against an existing pin table, not a second hashing implementation — bom.json's recorded hash is asserted equal to FORMATTER_ARTIFACT_PINS' value and to a fresh recompute() over the real bytes"

key-files:
  created:
    - bbj-vscode/tools/formatter/lib/bom.json
    - bbj-vscode/tools/formatter/lib/README.md
  modified:
    - bbj-vscode/test/formatter-pins-drift.test.ts

key-decisions:
  - "bom.json's coordinate fields are asserted to reconstruct their own purl (pkg:maven/${group}/${name}@${version}) and the pin's relativePath is asserted to equal lib/${name}-${version}.jar, so the SBOM, the purl and the vendored filename cannot silently drift apart from each other"
  - "The bom.json-drift and README-drift tests reuse the existing file's recompute() helper and FORMATTER_ARTIFACT_PINS lookup rather than adding a second hashing implementation, per the plan's prohibition on duplicating formatter-verifier.ts's compare logic"

patterns-established:
  - "Any future SBOM or provenance record for a vendored artifact should cross-check against the existing pin table's committed hash rather than re-implementing the digest comparison"

requirements-completed: [DEP-02]

coverage:
  - id: D1
    description: "bom.json is a CycloneDX 1.5 SBOM with exactly one jcommander 1.71 component, whose purl, hash and provenance properties match FORMATTER_ARTIFACT_PINS and the real vendored bytes; the existing drift suite fails if any of the three (real bytes, pin table, SBOM) stop agreeing"
    requirement: DEP-02
    verification:
      - kind: unit
        ref: "test/formatter-pins-drift.test.ts#lib/bom.json records the vendored jcommander with the pinned SHA-256"
        status: pass
      - kind: other
        ref: "node: bom.json shape/component/hash assertion script (Task 1 verify 2)"
        status: pass
    human_judgment: false
  - id: D2
    description: "README.md next to the JARs states the jcommander provenance in prose (coordinate, version, vendor, license, SHA-256, size, purl, vendored date), how to run an advisory check, and the 2026-09-28 OSV result; a drift test ties its SHA-256 and purl to bom.json"
    requirement: DEP-02
    verification:
      - kind: unit
        ref: "test/formatter-pins-drift.test.ts#lib/README.md states the jcommander SHA-256 and purl recorded in bom.json"
        status: pass
    human_judgment: false
  - id: D3
    description: "OSV was queried with the purl read from bom.json and returned no advisory for jcommander 1.71, with a live positive-control query (guava 31.1-jre) confirming the query path itself is live; the Snyk-only build-time finding is surfaced, not acted on, and the JAR was not swapped"
    requirement: DEP-02
    verification:
      - kind: other
        ref: "bash: OSV purl query against bom.json's purl plus positive-control query (Task 2 verify 2)"
        status: pass
    human_judgment: true
    rationale: "Whether the Snyk build-time-only finding is correctly assessed as not applicable to a vendored binary, and whether the origin prose is honest and sufficient, is a judgment call for the user to confirm — recorded here for that review, not re-derivable by an automated check"

duration: 9min
completed: 2026-09-28
status: complete
---

# Phase 117 Plan 03: DEP-02 formatter jcommander provenance Summary

**A CycloneDX `bom.json` and a plain-prose `README.md` now record jcommander 1.71's Maven coordinate, publisher, license and SHA-256 next to the vendored JAR, cross-checked by two new vitest assertions against the existing `FORMATTER_ARTIFACT_PINS` table, with a live OSV query confirming no advisory for the recorded coordinate.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-28T16:38:26Z (approximate, from session start)
- **Completed:** 2026-09-28T16:47:26Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 extended)

## Accomplishments

- `bbj-vscode/tools/formatter/lib/bom.json`: a single-component CycloneDX 1.5 SBOM for jcommander 1.71 (group `com.beust`, purl `pkg:maven/com.beust/jcommander@1.71`, publisher Cedric Beust, Apache-2.0 license, one SHA-256 hash matching both the committed pin and the real on-disk bytes, plus `bbj:vendoredPath`/`bbj:vendoredOn`/`bbj:origin` properties)
- `bbj-vscode/tools/formatter/lib/README.md`: a human-readable provenance note next to the JARs — a table with the same facts as `bom.json`, an origin paragraph explaining why no upstream digest exists for this exact version, an advisory-check how-to (`osv-scanner scan --sbom …`), a "Not recorded here" note for the two BASIS JARs (no public coordinate), and an "Updating" note tying future re-vendoring to `bom.json`, this file and `FORMATTER_ARTIFACT_PINS` together
- Two new tests in `bbj-vscode/test/formatter-pins-drift.test.ts`, in the existing `describe` block: one asserts `bom.json`'s shape, coordinate-self-consistency (`purl` reconstructs from `group`/`name`/`version`; the pin's `relativePath` matches `lib/${name}-${version}.jar`), and hash equal to both the pin and a fresh `recompute()` over the real bytes; the other asserts `README.md` contains the pinned SHA-256 exactly once and the SBOM's purl
- OSV was queried live on 2026-09-28 with the purl read from `bom.json` (`pkg:maven/com.beust/jcommander@1.71`) and returned no advisory (`{}`); a positive-control query for `pkg:maven/com.google.guava/guava@31.1-jre` in the same session returned `CVE-2023-2976`, confirming the query path is live rather than silently failing closed

## Task Commits

1. **Task 1: A CycloneDX bom.json records the vendored jcommander, and the drift suite fails if it stops matching the real JAR** - `ec8a67b9` (build)
2. **Task 2: A README next to the JARs states the provenance and how to check it, and OSV confirms no advisory for the recorded coordinate** - `30effec4` (docs)

**Plan metadata:** committed together with this SUMMARY

## Files Created/Modified

- `bbj-vscode/tools/formatter/lib/bom.json` - CycloneDX 1.5 SBOM, one jcommander 1.71 component
- `bbj-vscode/tools/formatter/lib/README.md` - prose provenance table, origin notes, advisory-check how-to, OSV result
- `bbj-vscode/test/formatter-pins-drift.test.ts` - two new tests (`bom.json` drift, `README.md` drift) plus a shared `remediationSbom()` helper

## Decisions Made

- Cross-checked `bom.json`'s coordinate fields against themselves (`purl` must equal `pkg:maven/${group}/${name}@${version}`) and against the pin table's `relativePath` (must equal `lib/${name}-${version}.jar`), so the file name, the pin and the SBOM's own coordinate fields cannot silently disagree with each other — a stricter check than the plan's literal ask, added because it was a near-zero-cost extension of the same assertion block.
- Reused the existing `recompute()` helper and `FORMATTER_ARTIFACT_PINS.find()` lookup for both new tests rather than writing a second hashing implementation, per the plan's explicit prohibition against duplicating `formatter-verifier.ts`'s compare logic.
- Recorded the Snyk-only jcommander finding (`SNYK-JAVA-COMBEUST-174815`, "Unsafe Dependency Resolution", versions before 1.75) in the README as a non-blocking, tangential note: it is absent from OSV, describes a build-time issue in jcommander's own dependency resolution over plain HTTP when built from source, and does not apply to a JAR vendored here as a committed binary that is never rebuilt from source in this repository's pipeline. Not acted on; the JAR was not swapped.
- The synthetic web-search "CVE-2026-9001x" pair against jcommander 1.82 (from a security-tooling test fixture unrelated to this project) is not cited anywhere in the committed text, per the plan's explicit prohibition.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed a planning decision ID from a committed test assertion message**
- **Found during:** Task 2 (post-Task-1 acceptance-criteria re-check of the full diff)
- **Issue:** The Task 1 test assertion message for the component-count check read "jcommander only, per D-01", violating the project rule that no decision ID may appear in committed text (source, test, JSON or README content).
- **Fix:** Reworded the message to "jcommander only" with no ID reference; re-ran the targeted vitest file to confirm the wording change did not affect test behavior (still 18/18 passed).
- **Files modified:** bbj-vscode/test/formatter-pins-drift.test.ts
- **Verification:** `grep -c -E '\bD-[0-9]{2}\b|...'` on the test file now prints 0; vitest still reports 18/18 passed.
- **Committed in:** `30effec4` (folded into the Task 2 commit, since the fix landed before Task 2's own commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — a planning-ID leak into committed text)
**Impact on plan:** No functional change; a documentation-hygiene fix required by the project's own committed-text rule. No scope creep.

## Issues Encountered

None. The whole-suite vitest run (`--maxWorkers=2`, JSON report) took several minutes and auto-backgrounded past the tool's foreground timeout; its own `npx vitest run` process exited with code 1 (the known "failed suites report despite `numFailedTests: 0`" contention artifact from prior phases in this milestone), but the JSON report's `numFailedTests` was 0 across 3588 tests in 761 files, satisfying the plan's judgment rule ("judge only on `numFailedTests`"). No per-file re-comparison against the phase base was needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Requirement DEP-02 is complete: the vendored formatter JAR with a public coordinate (jcommander 1.71) now carries a committed CycloneDX SBOM and a human-readable provenance note, both cross-checked against the existing SHA-256 pin table by the vitest drift suite, and a live OSV query against the recorded coordinate returned no advisory.
- Roadmap success criterion 2, as narrowed by the phase's D-01 decision to jcommander only, holds: `osv-scanner scan --sbom bbj-vscode/tools/formatter/lib/bom.json`, or any purl-based advisory lookup, can now answer "is the formatter's jcommander affected?".
- The two BASIS-supplied JARs (`BBjCFCli.jar`, `lib/BBjCodeFomatter.jar`) remain deliberately out of scope for this SBOM — they have no public coordinate an advisory database could match, and are being absorbed by bbj-ls's JSON-RPC formatter in a future phase, per the phase context's deferred-ideas note. They keep their existing SHA-256 pins in `formatter-verifier.ts`.
- Scratch evidence left outside the repository: `/home/coder/repos/tmp/phase-117/vitest-whole.json`, `vitest-whole.log` (whole-suite JSON report and log from this plan's final verification run).
- Ready for the next plan in Phase 117 (DEP-04 Guava bump, or DEP-05's external langium repro half).

---
*Phase: 117-dependency-hygiene-dependabot-coverage*
*Completed: 2026-09-28*

## Self-Check: PASSED

- `bbj-vscode/tools/formatter/lib/bom.json` found on disk
- `bbj-vscode/tools/formatter/lib/README.md` found on disk
- Task commit `ec8a67b9` found in git log
- Task commit `30effec4` found in git log
