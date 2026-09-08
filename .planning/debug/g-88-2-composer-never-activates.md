---
status: diagnosed
trigger: "G-88-2-composer-never-activates: Phase 88 tri-state SETOPTS composer (Code Action in VS Code, Alt+Enter intention in IntelliJ) never activates in either IDE per UAT"
created: 2026-09-08T00:35:00Z
updated: 2026-09-08T01:00:00Z
---

## Current Focus

hypothesis: CONFIRMED (VS Code: proven stale install, identical root-cause class to G-88-1;
  IntelliJ: strongly corroborated same class, not provable with file-level certainty from this
  environment — goal: find_root_cause_only, no fix applied)
test: n/a
expecting: n/a
next_action: Return ROOT CAUSE FOUND to caller

## Symptoms

expected: |
  Invoking the tri-state composer (Code Action in VS Code, Alt+Enter lightbulb in IntelliJ) on a
  canonical safe chain, changing one option to Set and one to Clear, and applying it — only the
  reassignment lines between the `OPTS` origin and the `SETOPTS` line change. Invoking it on a
  line with no SETOPTS shape nearby composes a new block — a whole new
  `var$=OPTS`/…/`SETOPTS var$` block is inserted at the line start. Invoking it on a chain
  interrupted by `IF`/`FI` (or `SWITCH`/`ON...GOTO`) offers no edit; a message names why the
  shape cannot be safely edited.
actual: |
  IntelliJ: invoking the intention (Alt+Enter) shows a "Searching Content Actions..." popup that
  hangs forever — no composer UI ever appears.
  VS Code: nothing happens at all when trying to invoke the composer — the tester was unsure how
  to even trigger it (no visible Code Action lightbulb / quick-fix affordance).
errors: None reported (no error dialogs — IntelliJ hangs on a search popup, VS Code shows nothing)
reproduction: |
  Test 2 in phase 88's UAT (.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-UAT.md).
  Tester's exact question: "how would I invoke it?" — suggesting the entry point itself
  (keybinding, menu item, Code Action registration, or IntelliJ intention registration) may not
  be discoverable/wired up in the live-built extensions, separate from whatever the composer UI
  logic does once invoked. Use the same repro code as the hover test (a canonical safe
  var$=OPTS(...)...SETOPTS var$ chain in a real .bbj file) to also verify the composer's actual
  behavior once/if it can be triggered.
started: Discovered during phase 88 human UAT on 2026-09-08, after phase 88 execution/verification (which used code-reading + targeted/whole-suite tests, not live-IDE invocation) reported this as implementation-complete.

## Eliminated

- hypothesis: "A genuine deadlock/infinite-loop bug in the shipped IntelliJ composer code
  (isAvailable, invoke, generatePreview, or the decodeInCode/composeTriState handlers) causes
  the 'Searching Content Actions...' popup to hang."
  evidence: |
    Read ConfigureSetoptsInCodeIntention.java in full: isAvailable() is a synchronous, cheap
    line-text scan (ComposerLauncher.isCaretOnSetoptsInCode -> three isCaretOnCall calls, each a
    bounded forward String.indexOf loop over one line of text -- provably terminates, no I/O, no
    LSP round-trip). generatePreview() returns a static IntentionPreviewInfo.Html(...) directly
    (never IntentionPreviewInfo.EMPTY), explicitly avoiding the fallback description-resource
    lookup that caused the prior composer-intention-description-missing bug (82-04's fix).
    invoke() only runs after an item is selected from the popup, so it cannot be the cause of a
    hang reported during the popup's own 'searching' phase. setopts-in-code-request.ts's
    createDecodeInCodeHandler/createComposeTriStateHandler on the server side are synchronous,
    non-recursive pure functions with no unbounded loop, and are not part of the LSP
    codeAction/diagnostics pipeline at all (both IDEs call the custom bbj/composer/setopts/*
    methods directly, never through textDocument/codeAction). bbj-code-action-provider.ts (the
    one handler wired to the standard LSP textDocument/codeAction request both IDEs' native
    lightbulb machinery can call) is untouched by Phase 88 and only processes unresolved-Java-
    class-reference linking diagnostics -- unrelated to SETOPTS, returns fast.
  timestamp: 2026-09-08T00:45:00Z

- hypothesis: "The IntelliJ+LSP4IJ Alt+Enter/'Searching Content Actions' mechanism is generally
  slow or unreliable for this plugin, independent of Phase 88."
  evidence: |
    82-UAT.md (archived at .planning/milestones/v4.2-phases/82-composer-robustness/82-UAT.md),
    Test 1, 2026-09-05, result: pass -- 'place the caret inside [a MSGBOX/addWindow/
    addChildWindow call], press Alt+Enter, and arrow onto the composer entry so the preview pane
    is computed' produced no error and no hang for all three sibling composer intentions, using
    the exact same IntentionAction/isAvailable/generatePreview/ShowIntentionsPass machinery
    ConfigureSetoptsInCodeIntention (Phase 88) reuses verbatim. This proves Alt+Enter/context-
    action search on this exact plugin+LSP4IJ integration is fast and reliable in general,
    ruling out a standing platform-level defect as the explanation for the new hang.
  timestamp: 2026-09-08T00:48:00Z

## Evidence

- timestamp: 2026-09-08T00:40:00Z
  checked: "88-05-SUMMARY.md and 88-06-SUMMARY.md (full read) -- composer implementation location
    and wiring for both IDEs"
  found: |
    VS Code (88-06): setopts-tristate-webview.ts + setopts-in-code-ui.ts implement a RefactorRewrite
    Code Action provider scoped to {language: 'bbj'} (providedCodeActionKinds declared), a
    bbj.composeSetoptsInCode command, an editor/context menu entry, and activation wiring in
    extension.ts/package.json -- all present in current repo source, 33 passing unit tests, no
    CodeLens (explicitly deferred to Phase 89 by design, decision D6).
    IntelliJ (88-05): SetoptsTriStateComposerDialog + ComposerLauncher.Kind.SETOPTS_IN_CODE +
    ConfigureSetoptsInCodeIntention, registered as plugin.xml's fourth <intentionAction> with its
    own intentionDescriptions/ resource directory -- all present in current repo source, DISC-06
    marked complete, whole IntelliJ JUnit suite green (736 tests), buildPlugin succeeds.
  implication: "The tri-state composer feature is genuinely and correctly implemented and wired
    in the current repository for both IDEs -- ruling out 'the feature was never built/wired' as
    the root cause. The question is why it doesn't reach the tester's live IDEs."

- timestamp: 2026-09-08T00:50:00Z
  checked: "Installed VS Code extension bundle at
    /home/coder/.ext-test/extensions/basis-intl.bbj-lang-0.12.28/ -- package.json and
    out/extension.cjs (the client-side extension host bundle, distinct from
    out/language/main.cjs which G-88-1 already checked) grepped for 'composeSetoptsInCode'"
  found: |
    grep -c 'composeSetoptsInCode' package.json => 0. grep for composeSetoptsInCode /
    SetOptsInCodeActionProvider / setoptsInCodeCandidateLine across out/*.cjs and out/**/*.cjs
    => zero matches anywhere in the installed bundle. package.json mtime / installedTimestamp
    2026-09-07T19:13:51Z (same install G-88-1 already proved predates every Phase 88 commit,
    earliest 2026-09-07T20:31:53Z).
  implication: "The VS Code extension actually installed and used for this UAT round has ZERO
    client-side entry points for the tri-state composer -- no command ID, no Code Action
    provider, no menu contribution, nothing registered in package.json's contributes block.
    This fully and directly explains 'nothing happens... no idea how to even trigger it': there
    is nothing to discover, because the installed bundle predates the feature's existence
    entirely. Same root cause class as G-88-1's VS Code hover finding, now independently
    re-confirmed against the composer-specific client bundle (not just the language-server
    bundle G-88-1 checked)."

- timestamp: 2026-09-08T00:55:00Z
  checked: "88-VERIFICATION.md (full grep for buildPlugin/vsix/distributions/install/rebuild);
    presence of an IntelliJ sandbox/installed-plugin directory anywhere in this devcontainer
    (find across /home/coder for *sandbox*, *IntelliJIdea*, JetBrains config dirs)"
  found: |
    88-VERIFICATION.md contains no mention of building, packaging, or installing either
    extension -- consistent with the symptom's own framing ('phase 88 execution/verification...
    used code-reading + targeted/whole-suite tests, not live-IDE invocation'). No IntelliJ
    sandbox, installed-plugin directory, or IDE config directory exists anywhere under
    /home/coder in this devcontainer (only Gradle's dependency cache under ~/.gradle and this
    repo's own bbj-intellij/build/ output). The only artifact resembling a 'live install' this
    devcontainer can inspect is VS Code's .ext-test extensions directory.
  implication: "Unlike the VS Code half, the tester's actual live IntelliJ installation runs on
    a separate host (their own macOS machine, per project memory
    uat-build-both-extensions-first.md) and is NOT accessible from this environment -- so
    IntelliJ's staleness cannot be proven with file-level certainty the way VS Code's was. This
    is a genuine evidentiary gap, not a confirmed absence of the bug; the conclusion for IntelliJ
    rests on corroborating evidence (no build/install step recorded anywhere in the phase 88
    trail; the project's own recurring-failure memory about skipping this exact step; and the
    source-level elimination of a genuine hang bug in the shipped code, above) rather than direct
    inspection."

- timestamp: 2026-09-08T00:58:00Z
  checked: "bbj-intellij build/libs/*.jar and build/distributions/*.zip mtimes vs. Phase 88 IntelliJ
    commit timestamps (git log)"
  found: |
    All Phase 88 IntelliJ-touching commits (88-05's three feat commits through the WR-A/WR-B/WR-C
    word-boundary fixes) landed by 2026-09-07T23:14:08Z. build/libs/bbj-intellij-0.1.0*.jar in
    this repo checkout are dated 2026-09-07T23:29:51Z (after all those commits -- a build was run
    in this working tree around that time). build/distributions/bbj-intellij-0.1.0.zip (the
      actual installable plugin artifact) is dated 2026-09-08T05:30:53Z -- after 88-UAT.md's own
    recorded session window (23:45:00Z-00:20:00Z) and matching the timestamp of the freshly
    rebuilt VS Code VSIX G-88-1 built during its own investigation, not a build tied to the UAT
    session itself.
  implication: "There is no distributable IntelliJ plugin zip in this repo whose timestamp lines
    up with 'built and handed to the tester before this UAT round' -- the only distributions zip
    on disk was built well after the UAT session concluded (during a later debug investigation).
    This is consistent with (though does not by itself prove) the same 'extensions were not
    rebuilt/reinstalled before UAT' gap that VS Code exhibits."

- timestamp: 2026-09-08T17:08:02Z
  checked: "shared-server latency probe: a real --node-ipc LSP connection to the freshly
    installed extension's out/language/main.cjs, opening examples/issue475-setopts-in-code.bbj
    with the compiler trigger left at its 'debounced' default (no compiler.trigger:'off'
    override, unlike the hover/composer probes above), measuring elapsed milliseconds from
    textDocument/didOpen to the first matching textDocument/publishDiagnostics notification,
    then immediately measuring a textDocument/codeAction request over the full range of the
    line carrying the first reported reproduction (a$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS
    A$), with an empty context.diagnostics and context.only omitted"
  found: |
    First publishDiagnostics for the fixture arrived in 11082ms (budget 30000ms). The
    subsequent textDocument/codeAction request over the reported reproduction's line resolved
    in 205ms (budget 15000ms), returning a result without error. Both measurements are well
    inside their budgets, on the shared language server the freshly installed extension serves.
  implication: "The one untested alternative the Eliminated section above left open -- a slow
    or blocked BBjCPL compile-diagnostics round trip specific to the SETOPTS snippet -- is
    eliminated at the shared-server layer: neither diagnostics computation nor codeAction
    collection is slow or blocked for this content on the shared server both IDEs use. The
    stale-install explanation (already PROVEN for VS Code, STRONGLY CORROBORATED for IntelliJ)
    is now the only surviving explanation for IntelliJ's reported hang; any residual risk is
    IntelliJ-platform-local (e.g. LSP4IJ's own action-collection machinery on the tester's
    specific IDE/OS), not a shared-server latency problem this probe could have caught."

## Resolution

root_cause: |
  Two related findings, one proven with certainty and one strongly corroborated:

  1. VS Code "nothing happens" / "no idea how to even trigger it" (PROVEN, environment/packaging,
     not a code bug): the tri-state SETOPTS composer is fully and correctly implemented in the
     current repository (setopts-tristate-webview.ts, setopts-in-code-ui.ts -- a RefactorRewrite
     Code Action provider, the bbj.composeSetoptsInCode command, and an editor context-menu
     entry, all wired into extension.ts/package.json, 33 passing tests). But the VS Code
     extension actually installed and used for this UAT round
     (basis-intl.bbj-lang-0.12.28, installed 2026-09-07T19:13:51Z -- the same install G-88-1
     proved predates every Phase 88 commit) has ZERO occurrences of the composer's command ID or
     any of its symbols in either its package.json contributes block or its compiled
     out/extension.cjs client bundle. There is no lightbulb, no command, no menu entry to find
     because the installed bundle was built before the feature existed at all -- exactly matching
     the reported "no idea how to even trigger it." Same root-cause class as G-88-1's VS Code
     hover finding (a stale/un-rebuilt extension install), now independently confirmed against
     the composer-specific client bundle.

  2. IntelliJ "hangs on Searching Content Actions..." (STRONGLY CORROBORATED, most likely the
     same environment/packaging gap, but not provable with file-level certainty from this
     environment): the tri-state composer's IntelliJ half is also fully and correctly implemented
     (SetoptsTriStateComposerDialog, ComposerLauncher.Kind.SETOPTS_IN_CODE,
     ConfigureSetoptsInCodeIntention registered as plugin.xml's fourth <intentionAction> with its
     own intentionDescriptions/ resources; DISC-06 marked complete; 736-test IntelliJ suite green).
     Source-level review of every code path Alt+Enter's action-collection phase could touch
     (isAvailable -- a bounded synchronous string scan; generatePreview -- returns a static
     IntentionPreviewInfo.Html directly, deliberately avoiding the fallback description-resource
     lookup that caused the earlier composer-intention-description-missing PluginException;
     plugin.xml's registration -- syntactically identical to the three working sibling
     intentions) finds no deadlock, unbounded loop, or blocking call that could explain a hang
     during the popup's own search phase, and invoke() (the one async path, guarded by
     ComposerFlow) only runs after an item is selected -- after the reported hang point, not
     during it. Phase 82's own human UAT (2026-09-05, 82-UAT.md Test 1) already proved this exact
     plugin's Alt+Enter/ShowIntentionsPass/LSP4IJ integration is fast and reliable for the three
     sibling composer intentions using identical mechanics, ruling out a standing platform-level
     defect. 88-VERIFICATION.md records no build/install/live-IDE step for either extension
     (verification was code-reading plus targeted/whole-suite tests only), and no distributable
     IntelliJ plugin zip in this repo carries a timestamp consistent with having been built and
     handed to the tester before the UAT session began (the only such zip on disk was built hours
     after the session, during a later debug investigation) -- both consistent with the same
     "extensions were not rebuilt/reinstalled before UAT" process gap already proven for VS Code.
     A pre-Phase-88 IntelliJ plugin build would not register ConfigureSetoptsInCodeIntention at
     all, so Alt+Enter would fall through to whatever else IntelliJ/LSP4IJ compute for that
     position -- consistent with the composer never surfacing, though it does not by itself
     fully explain the specific "hangs forever" wording.

     Blind spot (explicitly flagged, not resolved): this devcontainer has no accessible IntelliJ
     sandbox or installed-plugin directory (the tester's IntelliJ runs on a separate host, per
     project memory uat-build-both-extensions-first.md), so IntelliJ's staleness cannot be proven
     with the same certainty as VS Code's. If a rebuild+reinstall of the IntelliJ plugin does NOT
     resolve the hang, the next hypothesis to test would be whether Alt+Enter's diagnostics/
     quick-fix computation is stalling on something specific to the user's SETOPTS test snippet
     (e.g. a slow or blocked BBjCPL compile-diagnostics round trip triggered by the file's
     content) -- a scenario Phase 82's UAT never exercised, since its MSGBOX/addWindow test code
     carried no compiler diagnostics.

  Secondary, non-blocking design factor also contributing to "how would I invoke it?" even after
  a correct rebuild: by explicit Phase 88 design (88-06-SUMMARY.md decision D6), VS Code ships no
  CodeLens/persistent per-line marker for the in-code composer -- the only entry points are the
  Code Action lightbulb (Ctrl+.), the Command Palette, and the editor context menu. This
  discoverability gap is deliberately deferred to Phase 89 and is not itself the blocking cause
  of "nothing happens" (which is fully explained by the stale install above), but it means a
  freshly rebuilt extension still requires the user to know one of those three entry points
  exists.
fix: (not applicable — goal: find_root_cause_only)
verification: (not applicable — no fix applied in this session)
files_changed: []
