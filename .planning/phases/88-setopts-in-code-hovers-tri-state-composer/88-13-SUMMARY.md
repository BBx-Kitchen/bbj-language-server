---
phase: 88-setopts-in-code-hovers-tri-state-composer
plan: 13
subsystem: testing
tags: [packaging, intellij, vscode, gap-closure, uat, qa-docs]

# Dependency graph
requires:
  - phase: 88-setopts-in-code-hovers-tri-state-composer
    provides: "88-10's bbjHexLiteral/BbjHexLiteral.of formatter (both G-88-3 manifestations fixed at source), 88-11's decoder narrowing to the grammar's HEX_STRING terminal, and 88-12's bounded codeAction handler + IntelliJ second composer entry point (G-88-2's server-side root cause fixed) — all landed on the tree this plan rebuilds from"
provides:
  - "A shipped-artifact assertion (installed-extension-e2e.test.ts) proving, over a real LSP connection to the freshly rebuilt and reinstalled VS Code bundle, that every composeTriState-returned mask argument is a bare delimited hex literal with no quote character — the shipped-artifact counterpart of 88-10's unit oracle"
  - "A dated, sha256-identified IntelliJ plugin distributable (bbj-intellij-0.1.0.zip) proven from inside itself to carry the new context-menu action class, the Java hex-literal formatter class, and the unchanged ConfigureSetoptsInCodeIntention registration"
  - "QA/FULL-TEST-CHECKLIST.md rows 15/19 corrected to the bare hex sample syntax the tightened decoder now requires, plus a new row 22 for the IntelliJ context-menu composer entry point"
  - ".planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-LIVE-RETEST.md — round two of the scripted human retest, naming this plan's build identities, what changed since round one, and three checks (composer output validity, IntelliJ's two reachability doors, the still-unanswered live mask-width falsification)"
  - "88-UAT.md's G-88-2/G-88-3 missing: lists narrowed to exactly the live-render residue, with G-88-3 gaining a new automated_evidence: key and G-88-2's updated in place"
affects: []

# Actuals (#2632)
actuals:
  tokens: 9400
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shipped-artifact counterpart of a unit oracle: the same defect class the unit test pins (a mask argument wrapped in spurious quotes) is re-asserted over a real LSP connection to the bundle a user actually installs, not just against src/"

key-files:
  created: []
  modified:
    - bbj-vscode/test/functional/installed-extension-e2e.test.ts
    - QA/FULL-TEST-CHECKLIST.md
    - .planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-LIVE-RETEST.md
    - .planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-UAT.md

key-decisions:
  - "Forced a fresh `./gradlew clean buildPlugin` rather than accepting the UP-TO-DATE zip left over from plan 88-12's own build — content was already correct (no bbj-intellij/src change happened in between), but a clean rebuild gives this plan's own recorded build identity (mtime, sha256) an honest provenance rather than reusing a prior plan's artifact under a new name."
  - "Neither gap's status changed and neither this plan nor any other in the round populates gap_ids — only a human answering 88-LIVE-RETEST.md's three checks can move G-88-2 or G-88-3 off status: failed."
  - "88-LIVE-RETEST.md freely names gap ids and plan numbers (it is an internal planning artifact staged for gap closure); QA/FULL-TEST-CHECKLIST.md carries none, per its user-facing-documentation constraint — confirmed by grepping the diff, not assumed."

requirements-completed: [DISC-05, DISC-06]

coverage:
  - id: D1
    description: "Over a real LSP connection to the freshly rebuilt and reinstalled VS Code bundle, every composeTriState-returned reassignment line's mask argument is a bare $...$ delimited hex literal with no quote character anywhere in the composed text"
    requirement: DISC-06
    verification:
      - kind: e2e
        ref: "bbj-vscode/test/functional/installed-extension-e2e.test.ts#composeTriState mask arguments are bare delimited hex literals over the installed bundle, never quoted (gap-closure round two) — 16 passed, 1 skipped in the file"
        status: pass
    human_judgment: false
  - id: D2
    description: "The IntelliJ plugin distributable carries the new context-menu action class, its plugin.xml registration, the Java hex-literal formatter class, and the unchanged ConfigureSetoptsInCodeIntention registration"
    requirement: DISC-06
    verification:
      - kind: other
        ref: "unzip -l/-p assertions against the extracted plugin jar (all four gates passed: action class count 1, formatter class count 1, intention registration count 2, plugin.xml action entry present)"
        status: pass
    human_judgment: false
  - id: D3
    description: "QA/FULL-TEST-CHECKLIST.md no longer instructs a tester to hover the quoted SETOPTS/IOR/AND sample the decoder now correctly refuses, and covers the IntelliJ context-menu entry point"
    requirement: DISC-05
    verification:
      - kind: other
        ref: "grep -v '^#' QA/FULL-TEST-CHECKLIST.md | grep -c 'SETOPTS \"\\$' returned 0; git diff register-check clean"
        status: pass
    human_judgment: false
  - id: D4
    description: "G-88-2/G-88-3's actual live-render/live-runtime closure — a rendered Alt+Enter popup, a working context-menu invocation in a live IntelliJ, and a live BBjServices run deciding 88-RESEARCH.md Assumption A2"
    verification: []
    human_judgment: true
    rationale: "No IntelliJ sandbox exists in this devcontainer (probed directly by plan 88-09) and headless BBj cannot run here (probed directly by plan 88-09). Every gate in this plan proves an artifact/socket-layer fact against the build it names; none of it drives a live editor's rendered popup or a live BASIS runtime. 88-LIVE-RETEST.md stages the three checks a human must run."

duration: ~35min
completed: 2026-09-11
status: complete
---

# Phase 88 Plan 13: Ship the Round, Stage the Live Retest Summary

**Rebuilt both distributables and proved from inside them that this round's fixes ship — including a new shipped-artifact assertion that the installed VS Code bundle's composed mask literals are bare hex with no quotes — corrected the QA checklist's now-invalid hover sample syntax and added a row for IntelliJ's new context-menu composer entry, rewrote the scripted live retest as round two, and narrowed both open gap records to exactly the live-render residue.**

## G-88-2 and G-88-3 are still `status: failed` — this SUMMARY is NOT evidence of their closure

**Read this before anything else below.** Every gate in this plan proves a property of an
ARTIFACT (a spawned LSP server process answering correctly over the wire, a built plugin
distributable containing the right classes and registrations) or of SOURCE TEXT (unit tests from
plans 88-10 and 88-11). None of it observes a rendered Alt+Enter popup, a working right-click menu
entry, or a live BBjServices run. This devcontainer has no IntelliJ sandbox and cannot run BBj
headlessly — both probed directly by plan 88-09. The three checks staged in Task 3's
`<verify><human-check>` block (mirrored in the rewritten `88-LIVE-RETEST.md`) are harvested by the
end-of-phase verifier into the `human_needed` → `88-UAT.md` flow and answered in the next UAT round
— not here, and not by this autonomous run. `G-88-2` and `G-88-3` both still read `status: failed`.

## Performance

- **Duration:** ~35 min
- **Tasks:** 3
- **Commits:** 3

## Accomplishments

### Task 1: Both distributables rebuilt and proven from the inside

- Rebuilt and reinstalled the VS Code extension: `basis-intl.bbj-lang-0.12.28`,
  `installedTimestamp` `2026-09-11T10:47:24Z`.
- Added a new e2e assertion to the tri-state composer describe block in
  `installed-extension-e2e.test.ts`: over the real LSP connection to the INSTALLED bundle, sends
  `composeTriState` with one option Set and one Clear, and asserts every returned reassignment
  line's mask argument matches `,\$[0-9a-fA-F]+\$\)` (a bare dollar-delimited hex literal directly
  between the comma and the closing parenthesis) and that the whole composed text contains no `"`
  character — the shipped-artifact counterpart of plan 88-10's unit oracle for the same defect
  class. The whole file ran with **16 passed, 1 skipped** (non-zero — the install was not
  skipped).
- Rebuilt the IntelliJ plugin distributable via `./gradlew clean buildPlugin` (a forced clean
  rebuild rather than accepting the prior plan's UP-TO-DATE zip, so this plan's own recorded build
  identity has honest provenance): `bbj-intellij-0.1.0.zip`, sha256
  `e76f76824dcb4f706e454b8465fa069c941b0e1ef5ee9d6fb8e8ca84ce51cc66`, built from git HEAD
  `c4c70c3dd8356088b4f31846fcc8bd0bd38314ea`.
- Extracted the plugin jar by its exact path (`bbj-intellij/lib/bbj-intellij-0.1.0.jar`) and ran
  all four in-distributable assertions, all passing:
  1. `META-INF/plugin.xml` registers the new action `bbj.composeSetoptsInCode`,
     `com.basis.bbj.intellij.actions.BbjComposeSetoptsInCodeAction` — confirmed present.
  2. The jar contains `com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeAction.class` — grep
     count **1**.
  3. The jar contains `com/basis/bbj/intellij/composer/BbjHexLiteral.class` — grep count **1**.
  4. `META-INF/plugin.xml` still registers `ConfigureSetoptsInCodeIntention` — grep count **2**.
- `git status --short -- bbj-vscode/src bbj-intellij/src` was clean both before and after every
  build step in this task.

### Task 2: QA checklist corrected, IntelliJ context-menu row added, retest scripted for round two

- Rewrote rows 15 and 19's sample `SETOPTS`/`IOR`/`AND` lines from the invalid quoted form
  (`SETOPTS "$04$"`, `IOR(var$,"$01$")`, `AND(var$,"$FE$")`) to the bare delimited form the
  decoder now correctly requires and `examples/issue475-setopts-in-code.bbj` uses throughout.
  Checked rows 16 and 20 (they refer to "the canonical chain above" and inherit whatever the
  hover rows show) and confirmed no edit was needed there.
- Added row 22: the IntelliJ composer's editor-context-menu entry point, including confirming its
  absence in the resolved config file (which keeps its own SETOPTS composer entry, row 18),
  using the file's existing `<br>`-separated cell style.
- Confirmed via `grep -v '^#' ... | grep -c 'SETOPTS "\$'` → `0`: no row anywhere in the checklist
  still instructs a quoted hover sample. Confirmed via `git diff` that the QA diff carries no plan
  number, decision id, gap id or review-finding id.
- Rewrote `88-LIVE-RETEST.md` as round two, replacing round one's content: build identity to
  install (both distributables, this plan's Task 1 identities), a table naming what changed since
  round one against each round-one symptom, a table of what this round already proved
  automatically (do-not-re-derive), Check 1 (composer output validity, either IDE, both
  round-one failure signatures named verbatim), Check 2 (IntelliJ's two reachability doors,
  reported separately), Check 3 (live mask-width falsification, stated as an open question), why
  these three cannot be automated here (both probed facts), and an empty verdict block.

### Task 3: Both gap records narrowed to the residue

- `88-UAT.md`'s **G-88-2** `missing:` was replaced with exactly two items: the live Alt+Enter
  invocation in IntelliJ (popup appears and opens, timing noted) and the live context-menu
  invocation of the new entry point, both citing this plan's zip filename and sha256. Its existing
  `automated_evidence:` was updated in place to name the bounded codeAction handler, the
  `DocumentState.Linked` gate change, the cold-ordering measurement (7ms, down from the pre-fix
  56016ms hang), and the in-distributable class/registration assertions — stated explicitly as
  artifact-and-socket evidence, never a rendered popup.
- **G-88-3** gained a new `automated_evidence:` key (placed after `artifacts:`, before `missing:`,
  matching G-88-1/G-88-2's position) summarizing what plans 88-10, 88-11, and this plan's Task 1
  proved at three layers: generated text (88-10's literal-string oracle), accepted text (88-11's
  decoder narrowing and round-trip test), and the shipped bundle's own output over a real
  connection (this plan's Task 1). Its `missing:` was replaced with exactly two items: a live read
  of the composer's generated block in either IDE, and the live BBjServices run deciding
  88-RESEARCH.md Assumption A2 — stated explicitly as UNANSWERED, not expected to pass.
- `truth`, `status`, `reason`, `severity`, `test`, `root_cause`, `artifacts`, and `debug_session`
  are byte-identical to HEAD for both gaps (confirmed via `git diff` — only the `automated_evidence:`
  and `missing:` blocks changed). Both gaps still read `status: failed`. `## Tests`, `## Summary`,
  and every `result:`/`reported:` field are untouched. G-88-1's record was not touched at all.

## Task Commits

1. **Task 1: Rebuild both distributables and prove this round's fixes ship** —
   `c7324117` `test(88-13): assert the installed bundle's composed mask literals are bare hex, never quoted`
2. **Task 2: Correct the QA checklist, add the context-menu row, script round two** —
   `a4d4c935` `docs(88-13): correct QA hover sample syntax, add context-menu row, script retest round two`
3. **Task 3: Narrow both gap records to the residue** —
   `45015c57` `docs(88-13): narrow G-88-2/G-88-3 to their live-render residue`

## Files Created/Modified

- `bbj-vscode/test/functional/installed-extension-e2e.test.ts` — new shipped-bundle assertion in
  the tri-state composer describe block
- `QA/FULL-TEST-CHECKLIST.md` — rows 15/19 corrected to bare hex sample syntax; new row 22 for the
  IntelliJ context-menu composer entry
- `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-LIVE-RETEST.md` — rewritten as
  round two
- `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-UAT.md` — G-88-2/G-88-3
  `missing:`/`automated_evidence:` narrowed and updated

## Decisions Made

See `key-decisions` in frontmatter — summarized: forcing a clean IntelliJ rebuild rather than
reusing plan 88-12's leftover zip under a new identity; leaving `gap_ids` empty in this plan's own
frontmatter (already set at plan-authoring time, not a decision made during execution) so
`reconcile_gaps` cannot auto-close either gap; and the deliberate asymmetry between
`88-LIVE-RETEST.md` (freely names gap ids/plan numbers, an internal artifact) and
`QA/FULL-TEST-CHECKLIST.md` (carries none, a user-facing artifact), confirmed by grep rather than
assumed.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. `bbj-ext-install` and the ext-test rig were
already provisioned in this devcontainer.

## Assumption A2: still undecided

`88-RESEARCH.md` Assumption A2 (whether a composed SETOPTS-in-code block built on the
16-byte/32-hex-digit full-width mask base runs without raising a BBj `!ERROR` against a live
BASIS runtime) remains **undecided**. This devcontainer cannot run BBj headlessly:
`/opt/bbx/bin/bbj -q -c/opt/bbx/cfg/config.bbx -tT0 <prog>` terminates with `Must have a display
for GUI mode (SysWindow/ThinClient)`, and the non-GUI terminal aliases terminate with `Could not
find a termcap file: /etc/termcap`. No X server and no `xvfb-run` are installed. Check 3 in
`88-LIVE-RETEST.md` stages this for the next human retest, explicitly as an open question rather
than an expected pass — the original attempt (UAT test 8) aborted before `AND()` ever saw two
decoded operands, so a width defect here would be a NEW finding, not a return of the fixed
quoting defect.

## Next Phase Readiness

- Both distributables are rebuilt, reinstalled/repackaged, and proven from the inside to carry
  every fix from this gap-closure round (88-10, 88-11, 88-12, and this plan's own shipped-bundle
  assertion).
- `QA/FULL-TEST-CHECKLIST.md` can no longer produce a false regression report from its own sample
  syntax, and now covers the IntelliJ context-menu entry point.
- `88-LIVE-RETEST.md` is ready for the next human tester to run against the build identities it
  names, without needing to open any other file.
- `88-UAT.md`'s G-88-2 and G-88-3 records now distinguish exactly what is proven (artifact/socket
  layer, both gaps) from what remains (live-render layer for G-88-2, live-render plus live-runtime
  layer for G-88-3), with the build identities to test against named inline.
- No blockers for the next verification round. `gap_ids` in this plan's own frontmatter is
  deliberately empty, so `reconcile_gaps` cannot resolve either gap from this SUMMARY alone — only
  a human answering `88-LIVE-RETEST.md`'s three checks can.

---
*Phase: 88-setopts-in-code-hovers-tri-state-composer*
*Completed: 2026-09-11*

## Self-Check: PASSED

- FOUND: `bbj-vscode/test/functional/installed-extension-e2e.test.ts`
- FOUND: `QA/FULL-TEST-CHECKLIST.md`
- FOUND: `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-LIVE-RETEST.md`
- FOUND: `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-UAT.md`
- FOUND commit: `c7324117`
- FOUND commit: `a4d4c935`
- FOUND commit: `45015c57`
