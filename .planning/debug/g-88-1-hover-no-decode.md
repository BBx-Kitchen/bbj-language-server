---
status: diagnosed
trigger: "G-88-1-hover-no-decode: Phase 88 SETOPTS hover decode broken per UAT (VSCode: no hover at all; IntelliJ: literal works, chain/IOR/AND does not resolve OPTS)"
created: 2026-09-08T00:00:00Z
updated: 2026-09-08T00:30:00Z
audit_acknowledged:
  milestone: v4.3
  at: 2026-09-13
  status: diagnosed
---

## Current Focus

hypothesis: CONFIRMED (two independent root causes, no fix applied — goal: find_root_cause_only)
test: n/a
expecting: n/a
next_action: Return ROOT CAUSE FOUND to caller

## Symptoms

expected: |
  Hovering an absolute `SETOPTS <hex>` literal, a safe `var$=OPTS(...) ... SETOPTS var$` chain, a
  single `IOR(...)` call, and a single `AND(...)` call in a real `.bbj` file — in both VS Code
  and IntelliJ — shows the option(s) that line sets (or, for `AND`, the option(s) it CLEARS,
  never a raw/set bitmask).
actual: |
  VSCode: no hover at all — nothing appears on hover for any of these constructs.
  IntelliJ: works for a literal `SETOPTS <hex>` value, but appears unable to determine the
  running `OPTS` value for the `var$=OPTS(...) ... SETOPTS var$` / `IOR`/`AND` chain — so the
  IOR/AND hover doesn't decode correctly there either.
  Possible design question raised by user: should IOR/AND hover describe only what that call
  CHANGES (doesn't require resolving full runtime value) rather than a resulting/cumulative state?
errors: None reported (no error dialogs — hover silently shows nothing / shows an unexpected value)
reproduction: |
  Test 1 in phase 88's UAT (.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-UAT.md).
  Repro snippet used by the tester:
    REM three SETOPTS tests
    a$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$
    SETOPTS $00C20240000000000000000000000000$
    LET A$=OPTS
    LET A$(2,1)=AND(A$(2,1),$7F$)
    SETOPTS A$
  Hover each of: the `SETOPTS $00C2...$` literal, the `a$=OPTS`/`SETOPTS A$` chain (with the
  `IOR` reassignment), and the `LET A$=OPTS`/`SETOPTS A$` chain (with the `AND` reassignment) —
  in both the VS Code extension and the IntelliJ plugin, using live-built extensions per
  QA rows 15 and 19.
started: Discovered during phase 88 human UAT on 2026-09-08, after phase 88 execution/verification
  (code-reading + targeted/whole-suite tests, not live-IDE hover) reported implementation-complete.

## Eliminated

- hypothesis: "VS Code hover fails because the phase-88 SETOPTS branch is never reached at all (a wiring/registration bug in bbj-hover.ts or bbj-module.ts)"
  evidence: |
    HoverProvider is registered normally in bbj-module.ts (`HoverProvider: (services) => new BBjHoverProvider(services)`).
    bbj-hover.ts's getHoverContent has the SETOPTS branch placed correctly before the
    declaration-resolution path (per 88-01's own architectural-risk framing), and every shape has
    passing unit tests through the real getHoverContent path (test/hover.test.ts). This logic is
    identical for both IDEs (same compiled out/language/main.cjs). Since IntelliJ successfully
    decodes the literal SETOPTS case using the same server code, the server-side wiring is not
    broken. Eliminated in favor of a stale-install explanation (see Resolution).
  timestamp: 2026-09-08T00:15:00Z

- hypothesis: "The user's design question is a real ambiguity — the IOR/AND (mask-call) hover currently computes a resulting/cumulative OPTS state and needs a redesign to show only what the call changes"
  evidence: |
    Read setopts-code-scanner.ts's maskCallHoverMarkdown / detectSetOptsShape for the `mask-call`
    shape (hovering IOR/AND directly): it decodes ONLY `node.args[1]` (the call's own mask
    literal) via parseHexLiteral + describeMaskVector — it has zero dependency on chain
    resolution, the assignment target, or any prior OPTS value. Empirically verified: hovering
    the IOR token in the user's own `A$(1,1)=IOR(A$(1,1),$C2$)` line resolves target found:true,
    shape kind:'mask-call', and renders correct markdown `Sets these options: ...` — succeeding
    independent of the (separate, real) chain-walk bug below. AND is already framed as "Clears
    these options" (never a raw mask), also independent of chain state. So the implementation
    already does exactly what the user's design question proposes for the single-call shape;
    this is not an open design ambiguity, just a bug elsewhere (the chain shape) that reads to
    the user as "IOR/AND doesn't decode."
  timestamp: 2026-09-08T00:20:00Z

## Evidence

- timestamp: 2026-09-08T00:05:00Z
  checked: "88-01-SUMMARY.md, 88-02-SUMMARY.md, bbj-hover.ts, setopts-code-scanner.ts (full read)"
  found: |
    Three SETOPTS-in-code hover shapes exist: (a) absolute `SETOPTS <hex>` literal — pure decode,
    no chain logic; (b) `chain` — a `SETOPTS var$` statement whose `opts` is a SymbolRef, resolved
    by `traceOptsChain` walking backward through the enclosing flat statement array looking for a
    `var$=OPTS` origin through only `IOR`/`AND` reassignments of the same variable; (c) `mask-call`
    — a single `IOR`/`AND` call hovered directly, decoded from its own mask argument only, no
    chain walk. `matchStatement` (used by the chain walk) recognizes a reassignment link only when
    `assignment.variable` is a plain `SymbolRef` (checked via `symbolRefName`, which returns
    `undefined` for any non-`SymbolRef` node) AND `value.args[0]?.expression` (the IOR/AND call's
    first arg) is also a plain `SymbolRef` matching the tracked name.
  implication: "Any reassignment whose LHS or the IOR/AND call's own first argument is not a bare
    SymbolRef falls through matchStatement's per-assignment loop to the function's final
    `return { kind: 'irrelevant' }` — and walkChain treats 'irrelevant' as fully transparent
    (`case 'irrelevant': break;`), i.e. as if the statement didn't touch the tracked variable at
    all, rather than as an unsafe/unrecognized case."

- timestamp: 2026-09-08T00:08:00Z
  checked: "bbj.langium grammar: Assignment (`variable=MemberCall`) and MemberCall (PrimaryExpression
    followed by optional `.member`, `[indices]`, or `(args)` repetitions, the last inferring MethodCall)"
  found: |
    `A$(1,1)` — the idiomatic BBj byte-range/substring accessor the user's real reproduction code
    uses on both the LHS (`A$(1,1)=...`) and as the IOR/AND call's first argument
    (`IOR(A$(1,1),$C2$)`) — parses as a `MethodCall` (`method`=SymbolRef(A$), `args`=[1,1]), NOT a
    bare `SymbolRef`. This is a completely ordinary, idiomatic BBj pattern for mutating one byte of
    a multi-byte string like the 16-byte OPTS vector (exactly what the user wrote).
  implication: "symbolRefName(assignment.variable) and symbolRefName(value.args[0]?.expression)
    both return undefined for this pattern — never matching trackedName, never being recognized
    as either a valid link OR any of the five explicit unsafe reasons. The statement is silently
    treated as if it never referenced the tracked variable."

- timestamp: 2026-09-08T00:12:00Z
  checked: "Empirically reproduced via bbj-vscode's own parseHelper test harness (createBBjServices
    + EmptyFileSystem + parseHelper, mirroring test/setopts-code-scanner.test.ts's own pattern),
    calling traceOptsChain directly against the user's exact reported reproduction lines"
  found: |
    For `a$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$` => traceOptsChain returns
    `{ safe: true, links: [], effect: { set: [], clear: [] } }` (hasOriginNode: true).
    For `LET A$=OPTS\nLET A$(2,1)=AND(A$(2,1),$7F$)\nSETOPTS A$` => identical result:
    `{ safe: true, links: [], effect: { set: [], clear: [] } }`.
    In both cases the walk finds the `A$=OPTS` origin (the `A$(1,1)=...`/`A$(2,1)=...` statement
    is skipped as 'irrelevant', not recorded as a link), so it reports `safe: true` — but with
    ZERO links and an empty set/clear effect, silently losing the actual IOR/AND mutation. No
    crash, no "cannot be determined" message — the hover renders "Sets: (none) / Clears: (none)"
    for a chain that in reality sets/clears real bits. Test file used for reproduction was created
    under bbj-vscode/test/ and deleted after confirming the result (not part of the fix; a
    regression test belongs in the eventual fix commit's own task).
  implication: "This is a genuine logic bug matching the reported symptom exactly: 'appears
    unable to determine the running OPTS value for the chain' / 'IOR/AND hover doesn't decode
    correctly' — the walk fires, finds a safe-looking origin, but produces a decode that is
    silently empty/wrong rather than either the correct Sets/Clears list or a named unsafe
    reason. It violates the module's own documented invariant in setopts-code-scanner.ts's
    SetOptsUnsafeReason doc comment: 'Any ambiguity resolves toward an unsafe verdict, never
    toward a false link or origin — the walk must never touch a mask it cannot fully account
    for.' Confirmed via the same reproduction harness that the mask-call shape (hovering the IOR
    token directly) is unaffected by this bug and correctly renders 'Sets these options: ...'
    for the exact same array-indexed line, since it never depends on matchStatement/traceOptsChain
    at all."

- timestamp: 2026-09-08T00:18:00Z
  checked: "bbj-vscode/src/language/bbj-module.ts HoverProvider registration; timestamps and
    content of the only installed VS Code extension in this devcontainer
    (/home/coder/.ext-test/extensions/, extensions.json) vs. git commit timestamps for phase 88's
    hover commits vs. the freshly-built bbj-lang.vsix in the repo"
  found: |
    - extensions.json shows exactly one bbj-lang install active: `basis-intl.bbj-lang-0.12.28`,
      `installedTimestamp: 1788808431360` = 2026-09-07T19:13:51Z (also matches the on-disk
      out/language/main.cjs mtime for that install).
    - Phase 88's hover commits landed 2026-09-07T20:31:53Z (a720be33, first hover commit) through
      2026-09-07T23:16:54Z (3aea0872, the WR-B findAnchor fix) — i.e. ALL after the installed
      extension's 19:13:51Z install time.
    - `grep -c` for the phase-88 function names (setoptsHoverTarget, detectSetOptsShape,
      traceOptsChain, setoptsHoverMarkdown, foldChainEffect) against the INSTALLED extension's
      bundled `out/language/main.cjs` returns ZERO matches for every name — the installed build
      contains none of phase 88's hover code at all (it does contain 15 unrelated hits for the
      bare string "SETOPTS", from the pre-existing config.bbx-focused setopts-catalog.ts).
    - The same grep against the CURRENT repo's freshly-rebuilt `bbj-vscode/bbj-lang.vsix`
      (built 2026-09-08T05:30, i.e. after all phase 88 commits including the WR-B fix) finds all
      five function names present.
    - UAT was performed 2026-09-07T23:45:00Z-2026-09-08T00:20:00Z (per 88-UAT.md frontmatter),
      entirely after the WR-B fix landed (23:16:54Z) but using the extension installed at
      19:13:51Z — hours before the feature existed in source at all.
  implication: "The live VS Code extension used for the human UAT test predates Phase 88 entirely
    and contains none of its code — this fully explains 'VSCode: no hover at all' for every
    SETOPTS construct without any server-side logic defect. This is a stale-build/packaging gap
    (the extension was not rebuilt and reinstalled before UAT), consistent with the project's own
    documented UAT protocol requirement ('UAT: build both extensions first — build+install VSIX
    and IntelliJ zip before Test 1', per-project memory) — not a code bug. IntelliJ's ability to
    decode the literal case is consistent with its own installed build having been refreshed
    since Phase 88 landed, while VS Code's was not."

## Resolution

root_cause: |
  Two independent, unrelated root causes, both confirmed:

  1. VS Code "no hover at all" (environment/packaging, not a code bug): the only VS Code
     extension installed in this devcontainer during the human UAT test
     (basis-intl.bbj-lang-0.12.28, installed 2026-09-07T19:13:51Z) predates every Phase 88 hover
     commit (earliest 2026-09-07T20:31:53Z) and its bundled out/language/main.cjs contains zero
     occurrences of any of the phase-88 hover functions (setoptsHoverTarget, detectSetOptsShape,
     traceOptsChain, setoptsHoverMarkdown, foldChainEffect). A freshly rebuilt VSIX in the repo
     (built 2026-09-08T05:30) does contain all of them. The VS Code extension used for testing was
     simply never rebuilt/reinstalled after Phase 88 landed.

  2. IntelliJ (and VS Code, once rebuilt) chain/IOR-AND decode failure (real logic bug): in
     bbj-vscode/src/language/setopts-code-scanner.ts, `matchStatement()` — the per-statement
     classifier `traceOptsChain`'s backward walk uses — only recognizes an IOR/AND reassignment
     as a chain "link" when both the assignment's LHS (`assignment.variable`) and the IOR/AND
     call's own first argument are plain `SymbolRef` nodes (checked via `symbolRefName`, which
     returns `undefined` for anything else). BBj's idiomatic byte-range/substring accessor syntax
     `A$(1,1)` — used by the user's actual reproduction code on both sides of the assignment
     (`A$(1,1)=IOR(A$(1,1),$C2$)`) and matching the grammar's MemberCall→MethodCall production —
     parses as a `MethodCall`, not a `SymbolRef`. `symbolRefName` therefore returns `undefined` for
     both checks, matching neither the tracked variable name nor any of the five explicit
     `SetOptsUnsafeReason`s; the whole statement falls through to `{ kind: 'irrelevant' }`, which
     `walkChain` treats as fully transparent (skipped, not recorded). The walk then finds the
     `var$=OPTS` origin further back and reports `safe: true` with an EMPTY `links`/`effect` —
     silently losing the actual IOR/AND mutation instead of decoding it correctly or reporting a
     named unsafe reason. Empirically confirmed via traceOptsChain called directly against both of
     the user's exact reproduction lines (see Evidence above): both return
     `{ safe: true, links: [], effect: { set: [], clear: [] } }`. This violates the module's own
     documented safety invariant ("any ambiguity resolves toward an unsafe verdict, never toward a
     false link or origin").

  The user's separate design question — whether IOR/AND hover should describe only what that call
  changes rather than a cumulative/resulting state — is not an open ambiguity: the single-call
  ("mask-call") hover shape already does exactly that (decodes only `node.args[1]`, independent of
  any chain/runtime-value resolution), confirmed working correctly even on the exact array-indexed
  line from the bug above. Only the separate `chain` shape (hovering the `SETOPTS var$` statement
  itself) computes a cumulative/resulting effect, and that shape is where the real bug lives.
fix: (not applied — goal: find_root_cause_only)
verification: (not applicable — no fix applied in this session)
files_changed: []
