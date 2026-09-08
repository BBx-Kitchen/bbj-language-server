---
phase: 88-setopts-in-code-hovers-tri-state-composer
plan: 09
subsystem: testing
tags: [packaging, intellij, gap-closure, uat]
requires:
  - phase: 88-08
    provides: self-rebuilding VS Code packaging, installed-bundle e2e proof, shared-server latency measurement
provides:
  - "a dated, sha256-identified IntelliJ plugin distributable (bbj-intellij-0.1.0.zip) proven from inside itself to register ConfigureSetoptsInCodeIntention, ship its intentionDescriptions/ resources, contain SetoptsTriStateComposerDialog, and bundle a language server carrying all five Phase 88 hover symbols"
  - ".planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-LIVE-RETEST.md — the scripted human retest naming exact build identities, hover targets, composer entry points, expected wording, and why the remainder cannot be automated here"
  - "QA/FULL-TEST-CHECKLIST.md standing pre-UAT rebuild-and-reinstall step (both IDEs), placed first in the Instructions list"
  - "88-UAT.md's G-88-1/G-88-2 missing: lists narrowed to the live-render residue, with a new automated_evidence: key separating shipped-artifact evidence from live-editor evidence"
affects: []
actuals:
  tokens: 4130
  tasks: 3
  commits: 2
tech-stack:
  added: []
  patterns:
    - "In-distributable proof: extract the plugin jar from the built zip by its EXACT path (never a glob that also matches -searchableOptions.jar), then grep plugin.xml/jar-listing/bundled main.cjs directly, inverting a debug session's 'no artifact could have carried this' finding into a positive artifact check"
key-files:
  created:
    - .planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-LIVE-RETEST.md
  modified:
    - QA/FULL-TEST-CHECKLIST.md
    - .planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-UAT.md
key-decisions:
  - "Task 1 produced no tracked-file commit by design — its subject is a gitignored build artifact (bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip), asserted against but never committed, matching the plan's own files_modified scope"
  - "Neither gap's status changed and neither plan populates gap_ids — only a human answering 88-LIVE-RETEST.md's three checks can move G-88-1/G-88-2 off status: failed"
requirements-completed: []
coverage: []
duration: 5min
completed: 2026-09-08
status: complete
---

# Phase 88 Plan 09: IntelliJ Distributable Proof + Scripted Live Retest Summary

**Built and proved-from-inside a dated, hash-identified IntelliJ plugin distributable that ships the SETOPTS-in-code composer and this phase's hover code, wrote a self-contained scripted human retest naming both build identities, hardened the QA checklist with a standing pre-UAT rebuild step, and narrowed both gap records to exactly the live-render residue — G-88-1 and G-88-2 remain `status: failed`.**

## IMPORTANT: G-88-1 and G-88-2 are still `status: failed`

**This SUMMARY is not evidence of either gap's closure.** Every gate in this plan (and in 88-08)
proves properties of ARTIFACTS — that the correct code shipped in the correct bundle. None of it
observes whether a hover popup or a Code Action lightbulb actually renders on a human's screen in
a live editor. The three checks staged in Task 3's `<verify><human-check>` block are harvested by
the end-of-phase verifier into the `human_needed` → `88-UAT.md` flow and answered in the next UAT
round — not here, and not by this autonomous run.

## Performance

- **Duration:** ~5 min
- **Started:** 2026-09-08T17:26:37Z
- **Completed:** 2026-09-08T17:31:09Z
- **Tasks:** 3
- **Files modified:** 3 (1 new, 2 modified) — plus one gitignored build artifact (the IntelliJ zip) asserted against but never committed

## Accomplishments

### Task 1: IntelliJ distributable built and proven from inside itself

- Built `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` via `./gradlew buildPlugin`.
- **Artifact identity:** filename `bbj-intellij-0.1.0.zip`, sha256
  `cde1f2fe0d8af16b01d910ebd721f37a228351dd58e4b300bd55becdac1114d0`, mtime `2026-09-08T17:28:24Z`,
  built from git HEAD `59fc44f37230ba3edbc9eb94434bf6eb7c0dc93a` (mtime is after the HEAD commit's
  own timestamp `2026-09-08T17:24:45Z`, confirming the zip reflects that commit's tree).
- Extracted the plugin jar by its exact path (`bbj-intellij/lib/bbj-intellij-0.1.0.jar`, never a
  glob that would also match `-searchableOptions.jar`) and ran all five in-distributable
  assertions, all passing:
  1. `META-INF/plugin.xml` registers `ConfigureSetoptsInCodeIntention` — grep count **1**.
  2. The jar contains `intentionDescriptions/ConfigureSetoptsInCodeIntention/` resource entries —
     grep count **4**.
  3. The jar contains `com/basis/bbj/intellij/composer/SetoptsTriStateComposerDialog.class` —
     grep count **1**.
  4. The bundled `bbj-intellij/lib/language-server/main.cjs` matches all five Phase 88 hover
     symbols (`setoptsHoverTarget`, `detectSetOptsShape`, `traceOptsChain`,
     `setoptsHoverMarkdown`, `foldChainEffect`) — grep count **13** (≥5 required).
  5. `sha256sum` on the zip succeeded (recorded above).
- `git status --short` after the build shows no modification under `bbj-intellij/src/` — confirmed
  clean both before and after the build.
- This directly answers the g-88-2 debug session's central evidentiary gap ("no plugin zip on
  disk has a timestamp consistent with being built before the UAT") with a positive,
  dated, hash-identified counter-artifact.

### Task 2: Scripted human retest + hardened QA checklist

- Wrote `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-LIVE-RETEST.md` with all
  seven required sections: build identity to install (both IDEs, both identities from Task 1 and
  88-08), an "already proven automatically" table, Check 1 (hover, both IDEs, all four targets
  with expected wording including the negative byte-range case), Check 2 (composer, both IDEs, all
  entry points, three behaviours, both known failure signatures with the hang follow-up
  instruction), Check 3 (live mask-width falsification), why-not-automated (both probed
  environment facts verbatim), and an empty verdict block.
- Added a new first instruction to `QA/FULL-TEST-CHECKLIST.md`'s `**Instructions:**` list
  requiring a rebuild-and-reinstall of both IDE integrations before any row executes, with the
  exact commands for both IDEs and a one-sentence rationale citing `#475`. Renumbered the
  remaining five instructions sequentially. Rows 15, 16, 19, 20, 21 are byte-identical to HEAD
  (confirmed via `git diff` — the diff touches only the Instructions block).
- No planning identifier (plan number, decision id, gap id, review-finding id) appears anywhere in
  the `QA/FULL-TEST-CHECKLIST.md` diff — confirmed by reading the diff directly.

### Task 3: Gap records narrowed to the residue

- `88-UAT.md`'s G-88-1 and G-88-2 each gained a new `automated_evidence:` key (placed after
  `artifacts:`, before `missing:`) summarizing what 88-08 and this plan's Task 1 proved and at
  which layer — including the fact that G-88-1's underlying `matchStatement` code bug (byte-range
  accessor misclassified as `'irrelevant'`) was already fixed in Phase 88-07, before this
  gap-closure round began.
- Both `missing:` lists were replaced with only the live-render residue: the popup/lightbulb
  actually appearing in each IDE, against the named build identities. G-88-2 retained the reworded
  conditional entry about opening a fresh debug session on the Alt+Enter diagnostics-computation
  path if the hang persists against the verified-fresh build.
- `truth`, `status`, `reason`, `severity`, `test`, `root_cause`, `artifacts`, and `debug_session`
  are byte-identical to HEAD for both gaps (confirmed via the diff — only the two blocks were
  touched). Both gaps still read `status: failed`. `## Tests`, `## Summary`, and every
  `result:`/`reported:` field are untouched.

## Task Commits

1. **Task 1: Build the IntelliJ distributable and prove it from inside itself** — no commit (its
   subject, the gitignored `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`, is a build
   output outside `files_modified`; `git status --short` was clean before and after)
2. **Task 2: Script the human retest and harden the QA checklist** — `28ded8e3` (docs)
3. **Task 3: Narrow both gap records to the residue** — `4b0f2dc0` (docs)

## Files Created/Modified

- `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-LIVE-RETEST.md` (new) —
  scripted human retest document
- `QA/FULL-TEST-CHECKLIST.md` (modified) — standing pre-UAT rebuild-and-reinstall step, first in
  the Instructions list
- `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-UAT.md` (modified) — both gaps
  gained `automated_evidence:`; both `missing:` lists narrowed to the live-render residue
- `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` (gitignored build output, not
  committed) — the dated, hash-identified IntelliJ distributable Task 1 built and asserted against

## Build Identities (carried into 88-LIVE-RETEST.md)

- **VS Code** (from 88-08): extension `basis-intl.bbj-lang-0.12.28`,
  `installedTimestamp: 2026-09-08T17:01:55Z`
- **IntelliJ** (from this plan's Task 1): `bbj-intellij-0.1.0.zip`, sha256
  `cde1f2fe0d8af16b01d910ebd721f37a228351dd58e4b300bd55becdac1114d0`, built from git HEAD
  `59fc44f37230ba3edbc9eb94434bf6eb7c0dc93a`, mtime `2026-09-08T17:28:24Z`

## Assumption A2: still undecided

`88-RESEARCH.md` Assumption A2 (whether a composed SETOPTS-in-code block built on the
16-byte/32-hex-digit full-width mask base runs without raising a BBj `!ERROR` against a live
BASIS runtime) remains **undecided**. This devcontainer cannot run BBj headlessly to test it:
`/opt/bbx/bin/bbj -q -c/opt/bbx/cfg/config.bbx -tT0 <prog>` terminates with `Must have a display
for GUI mode (SysWindow/ThinClient)`, and the non-GUI terminal aliases (`-tT3`, `-tT4`) terminate
with `Could not find a termcap file: /etc/termcap`. No X server and no `xvfb-run` are installed.
Check 3 in `88-LIVE-RETEST.md` stages this for the human retest.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Worktree branch predated all of Phase 88's landed source, including 88-09-PLAN.md itself**
- **Found during:** Pre-Task-1 setup, before the required-reading step could locate any phase 88 file
- **Issue:** This agent's worktree branch (`worktree-agent-afc07d3229e90bb53`) was created from
  commit `c0b113c7` ("Bump preview version"), 251 commits behind `main` — before Phase 88 (and
  Phases 84-87) existed in the worktree at all. `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/`
  did not exist; neither did `88-09-PLAN.md`, the very file this executor was asked to run.
- **Fix:** `git merge --ff-only main` — a clean fast-forward with zero conflicts, since the
  worktree branch had no unique commits of its own (`merge-base(HEAD, main) == HEAD`). This is the
  same root cause and fix class 88-08-SUMMARY.md already recorded for its own worktree.
- **Files modified:** none beyond the merge itself (fast-forward only; no new commit created).
- **Verification:** `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-09-PLAN.md`
  present after the merge; `git status --short` clean; `git rev-parse HEAD` matched `main`'s tip at
  the time (`59fc44f3`).

**2. [Rule 3 - Blocking] `bbj-vscode/out/language/main.cjs` absent — Task 1's own precondition unmet due to gitignored build outputs never crossing worktree boundaries**
- **Found during:** Task 1 precondition check, before building the IntelliJ plugin
- **Issue:** Task 1's precondition ("`bbj-vscode/out/language/main.cjs` exists and was rebuilt by
  plan 88-08") assumed 88-08's rebuild was still present, but that rebuild happened in a
  *different* worktree whose gitignored `out/`, `node_modules/`, and `src/language/generated/`
  directories never propagated here — this worktree had none of them, and `./gradlew buildPlugin`
  fails fast without `main.cjs`.
- **Fix:** Copied `node_modules/` (307M) and `src/language/generated/` from the main repo checkout
  (verified at the identical commit, `git status --short -- bbj-vscode/` showing no local diff
  there) via plain `cp -r` — no git operation, no source change — then ran
  `npm --prefix bbj-vscode run build` in this worktree to produce a byte-equivalent
  `out/language/main.cjs` from the same source tree 88-08 already validated.
- **Files modified:** none tracked by git (`node_modules/`, `out/`, `src/language/generated/` are
  all gitignored).
- **Verification:** build exited 0; the rebuilt `out/language/main.cjs` contains all five Phase 88
  hover symbols (grep count 13); `git status --short` remained clean after the build; Task 1's own
  five in-distributable assertions (which depend transitively on this file being fresh) all passed.

---

**Total deviations:** 2 auto-fixed (1 bug — stale worktree base, identical root cause to
88-08-SUMMARY.md's own deviation 1; 1 blocking — gitignored build-output isolation between
worktrees, a structural consequence of the same root cause, worked around by rebuilding from the
identical merged-in source rather than any code change).
**Impact on plan:** Both were setup-only prerequisites for executing the plan at all in this fresh
worktree; neither touched any file outside `files_modified`/gitignored build paths, and neither
altered any assertion this plan's tasks make about the shipped artifacts.

## Issues Encountered

None beyond the two deviations above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `88-LIVE-RETEST.md` is ready for the human tester to run against the two build identities it
  names, without needing to open any other file.
- `QA/FULL-TEST-CHECKLIST.md` can no longer be run against a stale build without the first
  instruction telling the tester to rebuild.
- `88-UAT.md`'s G-88-1 and G-88-2 records now distinguish exactly what is proven (artifact layer,
  both IDEs) from what remains (live-render layer, both IDEs), with the build identities to test
  against named inline.
- No blockers for the next verification round. `gap_ids` in this plan's own frontmatter is
  deliberately empty, so `reconcile_gaps` cannot resolve either gap from this SUMMARY alone — only
  a human answering `88-LIVE-RETEST.md`'s three checks can.

---
*Phase: 88-setopts-in-code-hovers-tri-state-composer*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-LIVE-RETEST.md`
- FOUND: `QA/FULL-TEST-CHECKLIST.md` (modified, verified via diff)
- FOUND: `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-UAT.md` (modified, verified via diff)
- FOUND: `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` (sha256 cde1f2fe0d8af16b01d910ebd721f37a228351dd58e4b300bd55becdac1114d0)
- FOUND commit: `28ded8e3`
- FOUND commit: `4b0f2dc0`
