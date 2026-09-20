---
phase: 96-platform-integration-node-js-diagnosis
plan: 07
subsystem: ide-plugin
tags: [intellij, node-js, windows, attestation, lsp4ij]

requires:
  - phase: 96-platform-integration-node-js-diagnosis
    provides: "96-03's exact zip-entry match and guarded temp cleanup, 96-04's notification base, 96-05/96-06's unified NodeExecutableResolver/NodePresentation banner engine -- the build this attestation had to exercise"
provides:
  - "A real-Windows attestation of the Node.js auto-install pipeline, executed against the phase-final build -- outcome: FAILED"
  - "Two defects found and fixed during the attestation: the Node floor pin (v20.18.1 -> v22.23.2) and version-cache null poisoning (BbjNodeVersionCache)"
  - "Six further findings recorded as follow-up work, none fixed in this plan"
  - "A WINDOWS.md ledger entry (id 3) recording the unresolved blocker so the phase can close without a fabricated pass"
  - "Hand-UAT results for this phase's five intended observable changes and its four banners"
affects: [97-release, future-debug-session-on-windows-node-path-diagnostics]

actuals:
  tokens: 4200
  tasks: 1
  commits: 2

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - .planning/WINDOWS.md

key-decisions:
  - "PLAT-06 stays Pending, not Complete. The attestation is worth exactly the evidence behind it; the download half (node.exe + .sha256 sidecar) passed, the language-server-starts half did not, so the requirement is not met."
  - "The two defects the attestation surfaced (Node floor pin, version-cache null poisoning) were fixed inline during the attestation session and are already committed on this branch (1b6b83d3, a6b27b44, c41859dd, cb370e48, ae86384e) -- not re-fixed here. This plan only records the remaining, unresolved blocker."
  - "A failed attestation is recorded as a WINDOWS.md ledger entry (D-15) rather than holding Phase 96 open a third milestone in a row. The other five PLAT requirements are unaffected by this outcome."
  - "Six further findings (dead 'Show logs' link, ungraceful deleted-Node-path stack trace, indexing status-bar wording, VERSION_UNKNOWN wording, java.util.logging invisibility, missing setIndeterminate(false)) are recorded as follow-up, not fixed -- none was in this plan's scope, and finding 7 (java.util.logging never reaching idea.log) is named as the first thing any follow-up debug session must fix, since it is why this failure could not be diagnosed from the log at all."

requirements-completed: []

coverage:
  - id: D1
    description: "Node.js auto-install attested by hand on a real Windows machine against the phase-final build -- both distributables built, whole IntelliJ suite green under --rerun-tasks immediately before the build"
    requirement: "PLAT-06"
    verification:
      - kind: manual_procedural
        ref: "Hand attestation on Windows 10 / IntelliJ IDEA 2026.2.2 (Build #IU-262.10315.125), project 'tinybbj'"
        status: fail
    human_judgment: true
    rationale: "PLAT-06 is a human attestation by construction -- no Linux-hosted run can exercise the Windows filesystem, ACL and network path. The maintainer reported a failure; recording anything else would fabricate evidence that does not exist."
  - id: D2
    description: "Settings > Editor > Color Scheme has no BBj entry, and BBj files still highlight correctly"
    requirement: "PLAT-02"
    verification:
      - kind: manual_procedural
        ref: "Maintainer hand-UAT on the Windows build: confirmed 'it's correct'"
        status: pass
    human_judgment: true
    rationale: "Visual highlighting correctness requires a human looking at a running IDE."
  - id: D3
    description: "The server-crash banner appears on .bbx programs and no longer on .bbl files"
    requirement: "PLAT-03"
    verification:
      - kind: manual_procedural
        ref: "Maintainer hand-UAT on the Windows build: verified as one of this phase's intended observable changes"
        status: pass
    human_judgment: true
    rationale: "Banner appearance under real file-type resolution requires a running IDE."
  - id: D4
    description: "Crash detection and auto-restart: killing node.exe logs 'Language server stopped unexpectedly' and the server auto-restarts"
    requirement: null
    verification:
      - kind: manual_procedural
        ref: "Maintainer hand-UAT on the Windows build"
        status: pass
    human_judgment: true
    rationale: "Process-kill and restart timing requires a running IDE on the target OS."
  - id: D5
    description: "The missing-Node banner appears and its 'Download Node.js' action runs the install pipeline"
    requirement: "PLAT-04"
    verification:
      - kind: manual_procedural
        ref: "Maintainer hand-UAT on the Windows build"
        status: pass
    human_judgment: true
    rationale: "Banner and download-pipeline invocation require a running IDE; this is the half of PLAT-06 that passed."
  - id: D6
    description: "A too-old configured Node.js is rejected at startup and falls through to the detected/cached candidate"
    requirement: "PLAT-05"
    verification: []
    human_judgment: true
    rationale: "Not tested during this attestation session -- outstanding human verification, carried forward."
  - id: D7
    description: "With the plugin data directory unwritable, the banner names the cache problem and offers no 'Download Node.js' action"
    requirement: "PLAT-04"
    verification: []
    human_judgment: true
    rationale: "Not tested during this attestation session -- outstanding human verification, carried forward."
  - id: D8
    description: "The crash banner appears while the IDE is indexing (DumbAware)"
    requirement: "PLAT-03"
    verification: []
    human_judgment: true
    rationale: "Not tested during this attestation session -- outstanding human verification, carried forward."
  - id: D9
    description: "All four banners together, including Phase 95's wrong-peer wording on the java-interop one"
    requirement: null
    verification: []
    human_judgment: true
    rationale: "Not tested during this attestation session -- outstanding human verification, carried forward."

duration: 15min
completed: 2026-09-20
status: complete
---

# Phase 96 Plan 07: Windows Attestation (FAILED) Summary

**PLAT-06's real-Windows attestation failed: Node.js auto-install downloads a valid node.exe with its .sha256 sidecar, but the BBj language server does not start afterward -- two root causes fixed during the session, one blocker remains and is recorded in WINDOWS.md rather than holding Phase 96 open a third milestone.**

## Performance

- **Duration:** ~15 min (Task 3 only; this is a continuation agent resuming after Task 1's build and Task 2's human checkpoint)
- **Tasks:** 1 of 3 (Tasks 1-2 completed by prior agents; this session executed Task 3)
- **Files modified:** 1 (`.planning/WINDOWS.md`)

## Accomplishments

- Recorded the maintainer's hand attestation of the Node.js auto-install pipeline on real Windows (IntelliJ IDEA 2026.2.2, Build #IU-262.10315.125, Windows 10, project "tinybbj") against the phase-final build (`bbj-intellij-0.1.0.zip` sha256 `c40bf16fdf5479d3b1fe16fd5aef3c63a59b2186152cd5612f579081c77d4710` from commit `ae86384e`; `bbj-lang-0.15.3.vsix` sha256 `9c18fd42d20f693a2f5fe5ebcb2070e42d1705a4d2c0d6ea2924e167526d771a`; VS Code side packaged with `npx vsce package` from `bbj-vscode/`).
- Added WINDOWS.md ledger entry id 3 (phase 96, kind `unmet-truth`, status `open`) so the failed attestation is a tracked follow-up rather than a phase blocker. Counts: `open_count` 1 -> 2, `total_count` 2 -> 3, `fixed_count` unchanged at 1. Verified all three representations (frontmatter, markdown table, JSON mirror) agree via the plan's own automated consistency check.
- Left PLAT-06 Pending in REQUIREMENTS.md (unchanged, both the requirement checkbox and the traceability table already showed Pending going in) -- no requirement was touched by this task.
- Recorded the two code defects the attestation surfaced and already fixed on this branch, the six further findings that remain unfixed, and the full hand-UAT results for this phase's five intended observable changes plus its four banners.

## The Attestation Verdict (verbatim, transcribed faithfully)

**FAILED.**

The maintainer performed the attestation by hand on real Windows (IntelliJ IDEA 2026.2.2, Build
#IU-262.10315.125, Windows 10, project "tinybbj"). In their own words across the session:

- "node installs, then the 'Restart Language Server' popup, but after clicking nothin."
- Earlier run: "node download succees, no mor error, but the BBj Language Server says 'BBj Stopped'.
  Trying to restart does not change anything, it does not come up"
- "There is that server. When I compare to my Mac with the same plugin, on that Windows machine it
  just says 'BBj Language Server', but no running pid underneath."
- "The home is set correctly and login to EM works. Tools - Restart.. makes no difference."
- Running `node.exe --version` from a Windows prompt against the downloaded binary printed `v22.23.2`
  -- the binary itself is good.

**Conclusion:** the download half of PLAT-06 works -- `node.exe` plus its `.sha256` sidecar land
correctly in `bbj-intellij-data\nodejs`, 68 MB, verified by the maintainer. The "and the language
server starts afterward" half does NOT hold. PLAT-06's criterion is not met. No pass is recorded on
any other basis than this explicit reported failure.

## Two Defects Found and Already Fixed During the Attestation

Both are already committed on this branch and are NOT re-fixed by this plan -- they are what the
attestation session bought before the remaining blocker was isolated.

1. **Node floor defect** (commits `1b6b83d3`, `a6b27b44`, `c41859dd`, `cb370e48`). The auto-installer
   pinned Node `v20.18.1` while the shipped language-server bundle calls `Object.groupBy` (ES2024,
   needs Node 21+), pulled in via `chevrotain@12.0.0` (a transitive dependency of `langium ~4.3.1`)
   which itself declares `"engines": {"node": ">=22.0.0"}`. The version gate also only enforced
   `major >= 18`. Result: auto-install produced a runtime that could not run the server, failing at
   LSP `initialize` with `Object.groupBy is not a function`. Fixed by pinning `v22.23.2` with six
   official SHA-256 digests from nodejs.org, raising the gate to 22, and updating every user-visible
   string, test and doc page. Every CI workflow already pinned `node-version: 22` with the comment
   "langium 4.x toolchain requires Node 22+" -- the knowledge existed and never reached the plugin's
   installer.
2. **Version-cache null poisoning** (commit `ae86384e`). `BbjNodeVersionCache` memoized a null
   `node --version` result against a stat key that never changes again, in a JVM-lifetime static with
   no production invalidation. One transient probe failure therefore permanently rejected a good
   Node as `BELOW_MINIMUM_VERSION` -- silently, with no retry and no recovery short of restarting the
   IDE. Fixed: a null is no longer cached, and a new `Reason.VERSION_UNKNOWN` distinguishes "could not
   determine the version" from "determined it and it is too old". Fail-closed preserved.

## Six Further Findings (recorded as follow-up work, NOT fixed in this plan)

3. `Show logs` is a dead link on the LSP4IJ start-failure notification -- clicking it does nothing, at
   exactly the moment the user most needs the log.
4. A configured Node path whose target has been deleted produces a raw Java stack trace plus an error
   notification offering only "Configure Node.js Path", rather than the banner's friendlier route.
   (Maintainer: "We need to handle that gracefully.")
5. The status bar reads "BBj: Stopped" during indexing with no indication it is waiting on indexing.
   Platform-caused and minor -- only noticeable after a full cache invalidation.
6. `NodePresentation`'s VERSION_UNKNOWN wording, "reported a version that could not be determined", is
   self-contradictory -- nothing was reported. Cosmetic.
7. **The Node-path diagnostics are invisible.** `BbjLanguageServer` uses `java.util.logging.Logger`,
   not `com.intellij.openapi.diagnostic.Logger` (2 classes on JUL, 0 on IntelliJ's across the whole
   plugin). IntelliJ does not route JUL output to `idea.log`, so every `LOG.warning(rejected.toString())`
   in `resolveNodePath` goes nowhere. This is why the failure could not be diagnosed from the log at
   all, and it should be the FIRST thing fixed in any follow-up debug session.
8. `BbjNodeDownloader.java:101` calls `indicator.setFraction(...)` without ever calling
   `setIndeterminate(false)` (never called anywhere in the plugin). Logged by the platform as an
   IllegalStateException trace during every download. Cosmetic, does not abort the install.

## UAT Results (hand-verified by the maintainer on the same Windows machine)

**PASSED:**
- Settings has no BBj Color Scheme page, and BBj files still highlight correctly (keywords, strings,
  comments, numbers each distinct). Maintainer confirmed: "it's correct". Colours differ across IDE
  themes, which is the intended TextMate theme-following behaviour, not a regression.
- The server-crash banner appears on `.bbx` programs and no longer on `.bbl` files -- one of this
  phase's intended observable changes, verified.
- Crash detection and auto-restart work: killing node.exe logged "Language server stopped
  unexpectedly" and the server auto-restarted.
- The missing-Node banner appears and its "Download Node.js" action runs the install pipeline.

**NOT TESTED (outstanding human verification, carried forward):**
- A too-old configured Node.js is rejected at startup and falls through to the detected/cached
  candidate.
- With the plugin data directory unwritable, the banner names the cache problem and offers NO
  "Download Node.js" action.
- The crash banner appears while the IDE is indexing (DumbAware).
- All four banners together, including Phase 95's wrong-peer wording on the java-interop one.

## Task Commits

Task 1 (build both distributables) and Task 2 (the human-attestation checkpoint) produced no commits
of their own -- Task 1 was build-only per its `<done>` criterion ("committed (planning artefacts
only, no build output)", and no planning artefact changed in that task), and Task 2 is a checkpoint
with no file changes.

1. **Task 3: Record the attestation outcome either way** - `8162ebe6` (docs) -- adds WINDOWS.md entry
   3, recomputes ledger counts.

**Plan metadata:** recorded below (final commit).

## Files Created/Modified

- `.planning/WINDOWS.md` - added entry id 3 (phase 96, `unmet-truth`, open); `open_count` 1 -> 2,
  `total_count` 2 -> 3.
- `.planning/phases/96-platform-integration-node-js-diagnosis/96-07-SUMMARY.md` - this file.

## Decisions Made

- PLAT-06 stays Pending. The attestation's download half passed and its startup half failed, so the
  requirement's criterion (both halves) is not met -- there is no partial-credit reading of "and the
  language server starts afterward" that would justify Complete.
- The two already-fixed defects (Node floor pin, version-cache null poisoning) are documented here as
  what the attestation session bought, not re-implemented -- their commits (`1b6b83d3`, `a6b27b44`,
  `c41859dd`, `cb370e48`, `ae86384e`) already exist on this branch.
- The six further findings are recorded as follow-up, not fixed, per this plan's scope (build + attest
  + record). Finding 7 (java.util.logging never reaching idea.log) is flagged as the highest-priority
  follow-up because it is the reason the remaining blocker's root cause could not be diagnosed from
  `idea.log` in this session.
- `workflow.windows_enforce` is not set in `.planning/config.json`, so this new open entry does not
  block `/gsd-ship` today -- though WINDOWS.md entry 1 (Phase 70) is already open regardless.

## Deviations from Plan

None - Task 3 executed exactly as written: transcribed the verdict verbatim, added the ledger entry
via the CLI's own `windows append` verb (found under `gsd-tools windows append`, superseding the
plan's `--help`-driven `waive`/`fixed`-only expectation), verified the three ledger representations
stay consistent, and recorded UAT results without inferring or softening the outcome.

## Issues Encountered

None during Task 3. The CLI's `gsd-tools windows append --kind unmet-truth --phase 96 --description
"..."` command produced a ledger with all three representations (frontmatter, markdown table, JSON
mirror) consistent on the first attempt; the plan's automated verify script confirmed `open=2
total=3` against the file on disk.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 96's five other PLAT requirements (PLAT-01 through PLAT-05) are Complete and unaffected by
  this attestation's outcome, per D-15.
- PLAT-06 remains Pending, tracked as WINDOWS.md entry 3 (open) rather than holding the phase.
- The remaining blocker (language server does not start after a successful Node.js download on
  Windows) needs a dedicated debug session. That session's first step should be finding 7: switch
  `BbjLanguageServer`'s Node-path diagnostics from `java.util.logging.Logger` to IntelliJ's own
  `com.intellij.openapi.diagnostic.Logger` so the failure's real cause reaches `idea.log` at all.
- Phase 97 (Release 0.16.0) depends on Phase 96; PLAT-06's Pending status and the four outstanding
  UAT items (D6-D9 above) should be surfaced to the maintainer before that release ships, since none
  of the phase's other requirements block it but the unresolved blocker is user-visible on Windows.
- #613, #621, #622 close; #588 closes (PLAT-04); PLAT-06's originating todo
  (`2026-09-06-live-windows-check-for-node-auto-install-failure`) is now backed by a WINDOWS.md entry
  rather than left as a bare todo.

---
*Phase: 96-platform-integration-node-js-diagnosis*
*Completed: 2026-09-20*
