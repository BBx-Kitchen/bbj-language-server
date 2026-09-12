---
status: complete
phase: 88-setopts-in-code-hovers-tri-state-composer
source: [88-VERIFICATION.md, 88-LIVE-RETEST.md]
started: 2026-09-07T23:45:00Z
updated: 2026-09-12T05:10:00Z
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

### 4. Live retest Check 1 — hover decode in VS Code
expected: |
  See Current Test above (examples/issue475-setopts-in-code.bbj, 4 hover targets + 1 byte-range
  no-decode check, against the currently-installed basis-intl.bbj-lang-0.12.28).
result: pass

### 5. Live retest Check 1 — hover decode in IntelliJ
expected: |
  Same 5 hover targets in examples/issue475-setopts-in-code.bbj, in IntelliJ against a freshly
  built bbj-intellij-0.1.0.zip (Settings > Plugins > gear icon > Install Plugin from Disk...,
  restart when prompted). FAIL signature from last round: works for the literal but not the chain.
result: pass

### 6. Live retest Check 2 — tri-state composer in VS Code
expected: |
  In examples/issue475-setopts-in-code.bbj: (a) Ctrl+. lightbulb, Command Palette
  "bbj.composeSetoptsInCode", and editor right-click context menu all offer the composer;
  (b) invoking on the canonical safe chain (B$=OPTS ... SETOPTS B$) and editing only changes the
  reassignment lines between OPTS origin and SETOPTS; (c) invoking on a line with no SETOPTS shape
  composes and inserts a whole new var$=OPTS/IOR/AND/SETOPTS var$ block; (d) invoking on either
  byte-range chain offers no edit and names why. FAIL signature from last round: lightbulb never
  appears / nothing happens.
result: issue
reported: "It works but produces an invalid line: SETOPTS 20C20240000000000000000000000000 only valid in config.bbx. In a program it needs to be SETOPTS $20C20240000000000000000000000000$ . With that fixed, everything else is a pass"
severity: major

### 7. Live retest Check 2 — tri-state composer in IntelliJ
expected: |
  Same 4 behaviors as test 6, invoked via Alt+Enter on a SETOPTS-in-code line in IntelliJ against
  the freshly built bbj-intellij-0.1.0.zip. FAIL signature from last round: "Searching Content
  Actions..." popup hangs forever. If it still hangs, note how long and whether the file shows
  visible diagnostics at that moment.
result: issue
reported: "hangs on \"Searching for Context Option...\" and \"Pull Docker Image\""
severity: blocker

### 8. Live retest Check 3 — live mask-width falsification
expected: |
  Using the VS Code composer (test 6 — the only one currently invokable end-to-end; IntelliJ's
  still hangs per test 7), compose a new block with one option set to Set and one to Clear,
  insert it, and run the program as GUI/BUI/DWC against a live BBjServices. Since test 6 found the
  composer emits the bare-hex SETOPTS form (G-88-3), manually add the $...$ delimiters before
  running so this check isolates the mask-width question from the known delimiter bug. Expected:
  the generated IOR/AND calls (16-byte/32-hex-digit full-width mask base) run without raising a
  BBj !ERROR — confirms 88-RESEARCH.md Assumption A2 against real BASIS runtime behavior.
result: issue
reported: |
  Correction to the earlier "pass": !ERROR=17 (Strings must be the same length.) on
  [5] opts$=AND(opts$,"$DFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF$") for the composer's generated
  compose-new block:
    opts$=OPTS
    opts$=AND(opts$,"$DFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF$")
    SETOPTS opts$
  The problem is the double quotes: the mask is wrapped as a plain quoted string
  "$DFFF...$" instead of BBj's bare $...$ hex-string literal, so the $ delimiter characters
  are taken as literal text (making the operand longer than 16 bytes) instead of being decoded
  as hex — hence the length mismatch against opts$.
severity: blocker

### 9. Live retest round two — IntelliJ reachability, live mask-width, and the stale-edit guard (Checks 2-4 of 88-LIVE-RETEST.md)
expected: |
  See 88-LIVE-RETEST.md for the full script and verdict block. Check 2 (IntelliJ Alt+Enter and
  editor-context-menu doors), Check 3 (live mask-width falsification against a real BBjServices),
  and Check 4 (live observation of plan 88-15's stale-edit guard, added this session — requires
  rebuilding/reinstalling the VS Code extension past commit 1a6bdd42 first).
result: pass

## Summary

total: 9
passed: 3
issues: 5
pending: 0
skipped: 1
blocked: 0

## Gaps

- gap_id: G-88-1
  truth: "Hovering a SETOPTS literal, a safe var$=OPTS(...)...SETOPTS var$ chain, an IOR(...) call, and an AND(...) call in both VS Code and IntelliJ each names the option(s) that line sets/clears."
  status: resolved
  resolved_by: "live retest tests 4 (VS Code) and 5 (IntelliJ), both passed 2026-09-11 — all 5 hover targets, including the byte-range chain's named-unsafe-reason decode, render correctly against the rebuilt basis-intl.bbj-lang-0.12.28 and a fresh bbj-intellij-0.1.0.zip"
  resolved_at: 2026-09-11
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
  status: resolved
  resolved_by: "live retest test 9 (round two), Check 2 — IntelliJ Alt+Enter and editor-context-menu entry points both open the composer against the rebuilt bbj-intellij-0.1.0.zip (sha256 50ae9d74...), confirmed 2026-09-12"
  resolved_at: 2026-09-12
  reason: |
    User reported: how would I invoke it? In IntelliJ I just see a "Searching Content Actions..."
    popup hanging forever, in VSCode no idea, nothing happens.

    RETESTED 2026-09-11 (live retest Check 2, test 7) against the freshly built
    bbj-intellij-0.1.0.zip named in 88-LIVE-RETEST.md: the VS Code side of this gap is now fixed
    (test 6 passed on entry points/edit/compose/no-edit). The IntelliJ side still reproduces:
    user reports it "hangs on \"Searching for Context Option...\" and \"Pull Docker Image\"" — a
    NEW clue not present in the original report. A Docker-pull step appearing during Alt+Enter
    intention resolution is unexplained by anything in this gap's prior root-cause analysis (no
    Docker interaction anywhere in ConfigureSetoptsInCodeIntention or the shared language server)
    and needs fresh investigation, not a repeat of the prior diagnosis.
  severity: blocker
  test: 7
  root_cause: |
    VS Code side: RESOLVED — test 6 confirms all three entry points/edit/compose/no-edit now work
    against the rebuilt extension (superseded the prior "stale install" finding below).

    IntelliJ side (RE-DIAGNOSED 2026-09-11 against the fresh bbj-intellij-0.1.0.zip, with the new
    "Pull Docker Image" clue): Alt+Enter runs IntelliJ's `ShowIntentionActionsHandler` — ONE
    modal, EDT-blocking `ProgressManager.runProcessWithProgressSynchronously(...,
    "Searching for Context Actions...", true, project)` that evaluates every applicable intention
    for the caret across every installed plugin, not just BBj's. LSP4IJ 0.21.0 registers 20
    all-language `LSPIntentionActionN` intentions; their `isAvailable()` calls
    `ProgressIndicatorUtils.awaitWithCheckCanceled(Future)` — the single-arg, NO-TIMEOUT overload
    — waiting on the BBj server's `textDocument/codeAction` response. Langium gates
    `addCodeActionHandler` at `DocumentState.Validated`, a strictly later, no-timeout gate than
    hover's `DocumentState.Linked` (which is why hover — test 5 — passes and Alt+Enter — test 7 —
    hangs on the exact same build). A live probe against the tester's own workspace (whole
    bbj-language-server repo open, java-interop unreachable) measured hover at 53434ms and
    codeAction at 56016ms, with stderr showing `Java class resolution chain timed out after
    30000ms` — 88-08's reassuring "205ms/15000ms" measurement ran on an already-Validated
    document and never reproduced the actual Alt+Enter ordering, so it wrongly cleared this path.
    ConfigureSetoptsInCodeIntention itself is NOT at fault — it is never reached because the
    modal freezes on an earlier, unrelated LSP4IJ intention first.
    The "Pull Docker Image" sighting is EXCLUSIONARY, not causal: IntelliJ's bundled Docker
    plugin (`DockerPullIntention`) is also registered with no `<language>` restriction, so it too
    is evaluated on every Alt+Enter in any file type — but its `isAvailable()` needs a
    `DockerImagePsiReference` (contributed only for UAST/YAML/Dockerfile) and does zero I/O. Its
    only in-project trigger is this repo's own `.devcontainer/devcontainer.json`
    (`mcr.microsoft.com/devcontainers/typescript-node:20`), unrelated to Phase 88 — it just proves
    the hang sits in IntelliJ's shared, cross-plugin intention-search phase where a foreign
    plugin's item can appear at all.
    Why VS Code passed and IntelliJ hung against identical server behavior: VS Code's composer is
    a client-side `vscode.languages.registerCodeActionsProvider` in the extension host
    (setopts-in-code-ui.ts:75) that never calls the server's `textDocument/codeAction`; IntelliJ's
    is a genuine `IntentionAction` evaluated in the same blocking modal batch as LSP4IJ's generic
    LSP intention.
  artifacts:
    - path: "bbj-vscode/src/language/bbj-module.ts (+ Langium's addCodeActionHandler default)"
      issue: "textDocument/codeAction is gated at DocumentState.Validated with no timeout, while hover is gated at the much-earlier Linked state — the asymmetry that makes hover work and Alt+Enter hang when workspace validation is slow/stuck"
    - path: "bbj-vscode/src/language/bbj-code-action-provider.ts"
      issue: "correct in itself, but its response is gated behind the whole workspace validation cycle (and can further await a slow/unreachable java-interop round trip)"
    - path: "bbj-intellij/src/main/resources/META-INF/plugin.xml"
      issue: "depends on com.redhat.devtools.lsp4ij, which registers 20 all-language LSPIntentionActionN intentions that block Alt+Enter on any slow LSP codeAction response — no Docker dependency anywhere, confirming the Docker sighting is a foreign plugin's item, not a BBj-side cause"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureSetoptsInCodeIntention.java"
      issue: "confirmed NOT at fault — structurally identical to 3 working Phase 82 sibling intentions; simply never reached because an earlier LSP4IJ intention freezes the shared modal first"
  automated_evidence: |
    88-08 rebuilt and reinstalled the VS Code extension and proved, over a real LSP connection to
    the installed bundle, that all three composer entry points are registered in package.json's
    contributes block and the compiled out/extension.cjs client bundle, that decodeInCode opens
    the edit gate on the safe chain and keeps it shut with a named reason on the byte-range
    chains, that composeTriState renders the canonical block. 88-12 fixed and this plan's Task 1
    re-proved both server-side halves of this gap's root cause: textDocument/codeAction now
    answers within a named 5000ms budget, gated on the same DocumentState.Linked state hover uses
    (not the later, unbounded DocumentState.Validated); a cold-ordering probe against the
    reinstalled bundle (workspace = repo root, codeAction issued immediately after didOpen, no
    wait for diagnostics) measured 7ms, down from the pre-fix 56016ms hang on the same fixture.
    88-12 also added a second, non-intention editor-context-menu entry point into the IntelliJ
    composer, and this plan's Task 1 confirmed its action class and plugin.xml registration are
    present in the built distributable. All of this is artifact-and-socket evidence — a spawned
    LSP server process answering within budget, a built plugin distributable containing the new
    action — never a rendered Alt+Enter popup or a working right-click menu in a live IDE.
  missing:
    - "The live Alt+Enter invocation in IntelliJ against the build named below: the composer entry
      appears and opens, with the observed time-to-appear noted (zip bbj-intellij-0.1.0.zip,
      sha256 e76f76824dcb4f706e454b8465fa069c941b0e1ef5ee9d6fb8e8ca84ce51cc66)"
    - "The live invocation of the new editor-context-menu entry point on the same line, against
      the identical build (zip bbj-intellij-0.1.0.zip, sha256
      e76f76824dcb4f706e454b8465fa069c941b0e1ef5ee9d6fb8e8ca84ce51cc66), confirming it opens the
      same composer"
  debug_session: .planning/debug/g-88-2-docker-pull-hang.md (supersedes .planning/debug/g-88-2-composer-never-activates.md for the IntelliJ side; the VS Code finding there stands, now confirmed fixed)

- gap_id: G-88-3
  truth: "Every mask/hex literal the tri-state composer generates uses valid BBj program syntax: a bare $...$ hex-string literal — never a bare unquoted hex string (config.bbx-only syntax) and never a $...$ hex literal wrapped in an extra pair of double quotes (which makes BBj treat the $ delimiters as literal text instead of decoding the hex, corrupting the operand's byte length)."
  status: resolved
  resolved_by: "live retest test 9 (round two), Check 3 — live mask-width falsification against a real BBjServices passed with the rebuilt VS Code extension (HEAD f56c17e2), confirmed 2026-09-12"
  resolved_at: 2026-09-12
  reason: |
    Two manifestations found in live retest, both from the composer's mask-literal generation
    code path:

    (test 6, VS Code, Check 2) User reported: "It works but produces an invalid line: SETOPTS
    20C20240000000000000000000000000 only valid in config.bbx. In a program it needs to be
    SETOPTS $20C20240000000000000000000000000$ . With that fixed, everything else is a pass" —
    the SETOPTS argument is missing its required $...$ wrapping entirely.

    (test 8, VS Code, Check 3 — corrected after an initial mistaken "pass") User reported:
    "!ERROR=17 (Strings must be the same length.) [5] opts$=AND(opts$,"$DFFFFFFFFFFFFFFFFFFFF
    FFFFFFFFFFFFFFFFFF$") . for the generated block (opts$=OPTS / opts$=AND(opts$,"$DFFFF...
    FFFFF$") / SETOPTS opts$) . The problem is the double quotes" — here the opposite defect:
    the IOR/AND argument has an EXTRA pair of double quotes around the $...$ hex literal, so BBj
    takes the $ characters as literal text (not a hex decode marker), producing an operand whose
    decoded length no longer matches opts$'s 16 bytes.

    Both point at the same underlying defect: the composer's mask-literal formatter does not
    consistently emit BBj's bare $...$ hex-string literal syntax across every line kind it
    generates (SETOPTS argument vs. IOR/AND argument).
  severity: blocker
  test: 8
  root_cause: |
    Two independent defects sharing one design omission: there is no shared BBj-hex-literal
    formatter, so each generated line kind hand-rolls its own (wrong) literal syntax.

    (1) IOR/AND argument — a single-site template typo, setopts-catalog.ts:455/457:
      setLines.push(`${variable}=IOR(${variable},"$${singleBitIorMask(bit.byte, bit.mask)}$")`)
      clearLines.push(`${variable}=AND(${variable},"$${singleBitAndMask(bit.byte, bit.mask)}$")`)
    The `,"$` … `$")` wraps the hex literal in double quotes. bbj.langium:949-950 declares
    STRING_LITERAL (`"([^"]|"{2})*"`) and HEX_STRING (`\$[0-9a-fA-F]*\$`) as two distinct
    terminals, so `"$BFFF...$"` lexes as a plain 34-character string that is never hex-decoded —
    AND() then compares that against opts$'s 16 decoded bytes, raising !ERROR=17. Reproduced
    in-process against the production function: emits exactly `opts$=AND(opts$,"$BFFF...FFFF$")`.

    (2) SETOPTS argument — a two-condition contract mismatch (AND-gate: neither condition alone
    is a bug). setopts-in-code-request.ts:162 derives `hexRange` from the StringLiteral's CST
    node, so it spans the $ delimiters, while the sibling `hexDigits` field has them stripped.
    setopts-composer-webview.ts:91-93's writer replaces that range with bare `hexDigits` — because
    that writer was built for config.bbx (#474), where bare hex IS correct syntax, and 88-06
    (cfe9bed0) routed BBj-program absolute mode into it unchanged. Delimiters in, bare digits out
    → the $...$ wrapper is deleted. Reproduced in-process: emits exactly
    `SETOPTS 20C20240000000000000000000000000` — character-for-character the UAT's bad line.

    Why it shipped un-caught: the only test asserting exact composer output
    (setopts-catalog.test.ts:343-344) builds its expectation by re-evaluating the same template
    literal as production — a tautological oracle that cannot fail on the delimiter form. Sibling
    tests use only toContain('IOR'). parseHexLiteral (setopts-code-scanner.ts:141-156) also
    accepts the invalid quoted form as readily as the correct one, so the bug round-tripped
    cleanly through decode-side tests too (setopts-in-code-request.test.ts:55,91,166).
    Stale-install ruled out (the class that explained G-88-1/G-88-2): reported output matches
    current HEAD exactly. Mask values/widths ruled out: exactly 32 hex digits, one bit off the
    0x00/0xFF base — correct; test 8's actual purpose (88-RESEARCH.md Assumption A2) remains
    UNVERIFIED because the quoting defect aborted the run before AND() ever saw two decoded
    operands.
  artifacts:
    - path: "bbj-vscode/src/setopts-catalog.ts"
      issue: "lines 455/457: spurious double quotes around the $...$ hex literal in generated IOR/AND set/clear lines — server-side, so it hits both IDEs"
    - path: "bbj-vscode/src/language/setopts-in-code-request.ts"
      issue: "line 162: hexRange spans the $...$ delimiters while the sibling hexDigits field strips them — an undocumented, inconsistent contract between the two fields"
    - path: "bbj-vscode/src/setopts-composer-webview.ts"
      issue: "lines 91-93: the config.bbx-only bare-hex writer (#474) is reused unchanged for BBj-program absolute-mode SETOPTS syntax (routed here by 88-06 cfe9bed0), deleting the required $...$ wrapper"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java"
      issue: "line 501: independently duplicates manifestation (1) on the IntelliJ side — currently masked by G-88-2's hang, so untested live, but will surface once G-88-2 is fixed"
    - path: "bbj-vscode/test/setopts-catalog.test.ts"
      issue: "lines 343-344: tautological oracle (expectation built from the same production template literal) — cannot catch this class of bug"
    - path: "bbj-vscode/test/setopts-in-code-request.test.ts"
      issue: "lines 55/91/166 fixtures use the invalid double-quoted form; line 87 pins the delimiter-inclusive hexRange contract — a fix narrowing hexRange must update this"
  automated_evidence: |
    88-10 fixed both manifestations at their source (one shared bbjHexLiteral/BbjHexLiteral.of
    formatter, routed through by composeSetOptsBlock's IOR/AND lines and both hosts' absolute
    in-place writers) and proved the emitted TEXT is valid BBj syntax with a non-tautological,
    literal-string test oracle. 88-11 narrowed the decoder to the grammar's own HEX_STRING shape
    so a quoted literal is rejected rather than accepted at all three decode sites, and proved the
    absolute edit contract's range and formatter compose via a dedicated round-trip test. This
    plan's Task 1 re-proved the fix at the shipped-artifact layer: over a real LSP connection to
    the freshly rebuilt and reinstalled VS Code bundle, every composeTriState-returned
    reassignment line's mask argument is a bare delimited hex literal with no quote character
    anywhere in the composed text. All three layers — generated text, accepted text, and the
    shipped bundle's own output over the wire — are proven; none of it drives a live BASIS
    runtime.
  missing:
    - "A live read of the composer's generated block in either IDE: each IOR/AND argument a bare
      delimited hex literal with no quotes, and the in-place SETOPTS rewrite keeping its
      delimiters — against the build named in 88-LIVE-RETEST.md"
    - "The live BBjServices run that finally decides 88-RESEARCH.md Assumption A2 (is a
      16-byte/32-hex-digit mask the right width against a real OPTS value). This question is
      still UNANSWERED, not expected to pass — the quoting defect aborted the original attempt
      before AND() ever saw two decoded operands, so a width defect here would be a NEW finding,
      not a regression"
  debug_session: .planning/debug/g-88-3-composer-mask-literal-quoting.md
