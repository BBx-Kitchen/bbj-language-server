---
status: diagnosed
phase: 88-setopts-in-code-hovers-tri-state-composer
source: [88-VERIFICATION.md]
started: 2026-09-07T23:45:00Z
updated: 2026-09-08T01:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Hover decode in both live IDEs (QA rows 15, 19)
expected: |
  Hover an absolute `SETOPTS <hex>` literal, a safe `var$=OPTS(...) ... SETOPTS var$` chain, a
  single `IOR(...)` call, and a single `AND(...)` call in a real `.bbj` file — in both VS Code
  and IntelliJ. Each hover names the option(s) that line sets; the `AND` hover names the
  option(s) it CLEARS (never shown as a raw/set bitmask).
result: issue
reported: "VSCode: no hover at all. IntelliJ: works for a literal SETOPS but it appears it can't determine OPTS from the runtime. This also makes to sense to determine the current opts - IOR or AND just set or unset something, so the hover bubble only would need to say what it changes in that place, not what it results in. tested with the following code block:   REM three SETOPTS tests\n\na$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$\n\nSETOPTS $00C20240000000000000000000000000$\n\nLET A$=OPTS\nLET A$(2,1)=AND(A$(2,1),$7F$)\nSETOPTS A$"
severity: major

### 2. Tri-state composer end-to-end in both live IDEs (QA rows 16, 20)
expected: |
  Invoke the tri-state composer (Code Action in VS Code, Alt+Enter lightbulb in IntelliJ) on a
  canonical safe chain, change one option to Set and one to Clear, and apply — only the
  reassignment lines between the `OPTS` origin and the `SETOPTS` line change. Invoke it on a
  line with no SETOPTS shape nearby and compose a new block — a whole new
  `var$=OPTS`/…/`SETOPTS var$` block is inserted at the line start. Invoke it on a chain
  interrupted by `IF`/`FI` (or `SWITCH`/`ON...GOTO`) — no edit is offered; a message names why
  the shape cannot be safely edited.
result: issue
reported: "how would I invoke it? In IntelliJ I just see a \"Searching Content Actions...\" popup hanging forever, in VSCode no idea, nothing happens"
severity: major

### 3. Live-BBjServices mask-width falsification (QA row 21)
expected: |
  Against a live BBjServices, compose a new SETOPTS-in-code block via the tri-state composer
  setting one option to Set and one to Clear, insert it, and run the program as GUI/BUI/DWC.
  The generated `IOR`/`AND` calls (built on the 16-byte/32-hex-digit full-width mask base) run
  without raising a BBj `!ERROR` — confirms (or refutes) 88-RESEARCH.md Assumption A2's
  mask-width default against real BASIS runtime behavior.
result: skipped
reason: "composer isn't working (blocked by Test 2 failure — the tri-state composer never activates in either IDE, so a live-BASIS compose-and-run check cannot proceed)"

## Summary

total: 3
passed: 0
issues: 2
pending: 0
skipped: 1
blocked: 0

## Gaps

- gap_id: G-88-1
  truth: "Hovering a SETOPTS literal, a safe var$=OPTS(...)...SETOPTS var$ chain, an IOR(...) call, and an AND(...) call in both VS Code and IntelliJ each names the option(s) that line sets/clears."
  status: failed
  reason: |
    User reported: VSCode: no hover at all. IntelliJ: works for a literal SETOPS but it appears
    it can't determine OPTS from the runtime. This also makes to sense to determine the current
    opts - IOR or AND just set or unset something, so the hover bubble only would need to say
    what it changes in that place, not what it results in. Tested with:
      REM three SETOPTS tests
      a$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$
      SETOPTS $00C20240000000000000000000000000$
      LET A$=OPTS
      LET A$(2,1)=AND(A$(2,1),$7F$)
      SETOPTS A$
  severity: major
  test: 1
  root_cause: |
    Two independent causes.
    (1) VS Code "no hover at all" is a stale/un-rebuilt extension install, not a code bug: the
    installed extension (basis-intl.bbj-lang-0.12.28, installed 2026-09-07T19:13:51Z) predates
    every Phase 88 hover commit and its bundled out/language/main.cjs contains none of the
    Phase 88 SETOPTS hover symbols (setoptsHoverTarget, detectSetOptsShape, traceOptsChain,
    setoptsHoverMarkdown, foldChainEffect) — a freshly rebuilt bbj-lang.vsix has all of them.
    (2) IntelliJ's (and a rebuilt VS Code's) failure to decode the chain/IOR/AND case is a real
    logic bug in setopts-code-scanner.ts's matchStatement(): it only recognizes an IOR/AND
    reassignment as a chain link when both the assignment LHS and the call's first argument are
    plain SymbolRef nodes. BBj's idiomatic byte-range accessor A$(1,1) — used in the reproduction
    — parses as a MethodCall, not a SymbolRef, so matchStatement falls through to
    { kind: 'irrelevant' }, which walkChain treats as fully transparent. The real mutation is
    silently skipped and traceOptsChain reports safe:true with empty links/effect instead of an
    unsafe verdict — violating the module's own documented ambiguity-must-be-unsafe invariant.
    The user's separate design question (should IOR/AND hover show only what changes, not a
    cumulative state) is not an open ambiguity: the single-call ("mask-call") hover shape already
    does exactly that and works correctly even on the buggy array-indexed line; only the `chain`
    shape (hovering SETOPTS var$) computes a cumulative effect, which is where the bug is.
  artifacts:
    - path: "bbj-vscode/src/language/setopts-code-scanner.ts"
      issue: "matchStatement() misclassifies MethodCall-shaped (array/substring-indexed) assignment targets and IOR/AND first arguments as 'irrelevant' instead of a valid link or an explicit unsafe reason, producing a false safe:true verdict with empty links/effect"
    - path: "devcontainer VS Code extension install (/home/coder/.ext-test/extensions/basis-intl.bbj-lang-0.12.28)"
      issue: "installed bundle predates Phase 88 — needs rebuild + reinstall before further live UAT retesting (no source change)"
  automated_evidence: |
    88-08 rebuilt and reinstalled the VS Code extension (basis-intl.bbj-lang-0.12.28,
    installedTimestamp 2026-09-08T17:01:55Z) and proved, over a real LSP connection to that
    installed bundle, that all 5 hover assertions pass (absolute literal, IOR mask-call, AND
    mask-call, the byte-range chain's named-unsafe-reason decode, and the canonical safe chain's
    Sets/Clears) — the byte-range matchStatement bug this gap's root_cause names was already
    fixed in Phase 88-07 (feat(88-07) commits a44df25b/f88b958d), before this gap-closure round
    began. This plan's Task 1 additionally proved the IntelliJ distributable's bundled language
    server (the sole hover implementation surface for IntelliJ, per D-01) carries all five Phase
    88 hover symbols. Both are artifact-layer evidence only — neither drives a live editor's
    rendered popup.
  missing:
    - "Live-render check in VS Code: the hover popup actually appears for all four targets on
      the installed build above (basis-intl.bbj-lang-0.12.28, installedTimestamp
      2026-09-08T17:01:55Z)"
    - "Live hover check in IntelliJ: the LSP4IJ hover popup actually appears for all four
      targets, against the zip built by this plan's Task 1 (bbj-intellij-0.1.0.zip, sha256
      cde1f2fe0d8af16b01d910ebd721f37a228351dd58e4b300bd55becdac1114d0)"
  debug_session: .planning/debug/g-88-1-hover-no-decode.md

- gap_id: G-88-2
  truth: "Invoking the tri-state composer (Code Action in VS Code, Alt+Enter lightbulb in IntelliJ) on a SETOPTS-shaped chain offers an editable option list and applies the chosen changes."
  status: failed
  reason: |
    User reported: how would I invoke it? In IntelliJ I just see a "Searching Content Actions..."
    popup hanging forever, in VSCode no idea, nothing happens.
  severity: major
  test: 2
  root_cause: |
    (1) VS Code "nothing happens" is PROVEN environment/packaging, not a code bug: the composer
    (setopts-in-code-ui.ts + setopts-tristate-webview.ts: a RefactorRewrite Code Action provider,
    the bbj.composeSetoptsInCode command, an editor context-menu entry, 33 passing tests) is fully
    and correctly implemented in current source, but the same stale installed extension proven in
    G-88-1 has zero occurrences of the composer's command ID or symbols in package.json's
    contributes block or the compiled out/extension.cjs client bundle — there is no lightbulb, no
    command, no menu entry to find because the installed bundle predates the feature entirely.
    (2) IntelliJ's "Searching Content Actions..." hang is STRONGLY CORROBORATED as the same
    stale-install class but not provable with certainty from this devcontainer (no IntelliJ
    sandbox/install is accessible here — the tester runs IntelliJ on a separate host). Source
    review of ConfigureSetoptsInCodeIntention.isAvailable()/generatePreview()/invoke() and the
    server's decodeInCode/composeTriState handlers found no plausible hang mechanism (all
    synchronous/bounded, or async only after selection — after the reported hang point). Phase 82
    UAT (2026-09-05) already proved this exact Alt+Enter/LSP4IJ machinery is fast and reliable for
    3 sibling composer intentions, ruling out a standing platform defect. No IntelliJ plugin zip
    on disk has a timestamp consistent with being built and handed to the tester before this UAT
    session. If a verified-fresh IntelliJ install still hangs, the next hypothesis is a slow/
    blocked BBjCPL diagnostics round-trip specific to the SETOPTS test snippet — untested
    territory not covered by Phase 82's diagnostics-free UAT code.
    Secondary, non-blocking: by explicit Phase 88 design (88-06-SUMMARY.md decision D6), VS Code
    ships no CodeLens for the in-code composer — only Code Action/Command Palette/context-menu
    entry points — deliberately deferred to Phase 89. Adds to "how would I invoke it?" confusion
    even post-rebuild, but doesn't explain the complete absence observed (fully explained by the
    stale install).
  artifacts:
    - path: "bbj-vscode/src/setopts-in-code-ui.ts"
      issue: "correct composer implementation, absent from the installed extension bundle used for UAT (packaging gap, not a code defect)"
    - path: "bbj-vscode/src/setopts-tristate-webview.ts"
      issue: "correct composer implementation, absent from the installed extension bundle used for UAT (packaging gap, not a code defect)"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureSetoptsInCodeIntention.java"
      issue: "no hang mechanism found in source; installed-plugin freshness could not be verified from this devcontainer"
  automated_evidence: |
    88-08 rebuilt and reinstalled the VS Code extension and proved, over a real LSP connection to
    the installed bundle, that all three composer entry points are registered in package.json's
    contributes block and the compiled out/extension.cjs client bundle, that decodeInCode opens
    the edit gate on the safe chain and keeps it shut with a named reason on the byte-range
    chains, that composeTriState renders the canonical block, and that shared-server
    diagnostics/codeAction latency on the reported snippet is well within budget (11082ms/30000ms,
    205ms/15000ms) — eliminating a slow/blocked BBjCPL round trip as an explanation for the
    IntelliJ hang. This plan's Task 1 built a fresh IntelliJ distributable
    (bbj-intellij-0.1.0.zip, sha256
    cde1f2fe0d8af16b01d910ebd721f37a228351dd58e4b300bd55becdac1114d0) and proved it registers
    ConfigureSetoptsInCodeIntention, ships its intentionDescriptions/ resources, and contains the
    SetoptsTriStateComposerDialog class — the artifact the tester would need to install no longer
    has "no distributable zip that could have carried the feature" as an open question. None of
    this drives a live IDE's lightbulb or Alt+Enter popup.
  missing:
    - "Live composer invocation in VS Code through any of the three registered entry points
      (Code Action lightbulb, Command Palette, editor context menu), against the installed build
      basis-intl.bbj-lang-0.12.28 (installedTimestamp 2026-09-08T17:01:55Z)"
    - "Live Alt+Enter invocation in IntelliJ against this plan's Task 1 build
      (bbj-intellij-0.1.0.zip, sha256
      cde1f2fe0d8af16b01d910ebd721f37a228351dd58e4b300bd55becdac1114d0)"
    - "If the IntelliJ hang persists on this verified-fresh install, open a live-reproduction
      debug session on Alt+Enter's diagnostics-computation path for the SETOPTS test file"
  debug_session: .planning/debug/g-88-2-composer-never-activates.md
