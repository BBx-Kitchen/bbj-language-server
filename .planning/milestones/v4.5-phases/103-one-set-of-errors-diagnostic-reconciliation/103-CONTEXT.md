# Phase 103: One Set of Errors — Diagnostic Reconciliation - Context

**Gathered:** 2026-09-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Reconcile the three diagnostic sources that Phase 102 left side by side: Langium's own checks,
the live `BBj Parser` diagnostics from the `parseProgram` endpoint, and the save-time
`bbjcpl -N` run. The change applies **only while the per-connection latch says the endpoint is
on**:

1. A line that BBj's parser and the language server both complain about shows one diagnostic,
   BBj's, not two, and the save-time `bbjcpl` run adds nothing the endpoint already reported
   (PSRV-06).
2. When BBj's parser accepts a document, the developer sees no lexer, parser or line-break
   **error** from the language server for it (PSRV-07). Per D-04 below, Langium's complaints are
   downgraded to warnings rather than removed.
3. With the endpoint unavailable (older BBj, BBjServices down, latch off), the v3.7 / 0.16.x
   diagnostic behaviour returns unchanged. The suppression is conditional, never a permanent
   removal of checks.
4. A working conformance run at the phase boundary with the endpoint active shows list B
   falling from 658 of 1,210 towards ≤ 5 %, and compiler-accepted files carrying no
   language-server syntax error. The formal exit gate stays in Phase 104.

Requirements: PSRV-06, PSRV-07.

**Changes only this repository**: `bbj-vscode/src/language/` (`bbj-document-validator.ts`,
`bbj-document-builder.ts`, `bbj-parser-service.ts`, the line-break validator for tagging) and
`bbj-vscode/test/`. No `bbj-intellij/` change, no `bbj-ls` change, no new setting.

Not in this phase: Phase 105's move of live-parse scheduling out of `buildDocuments()` (#692);
making `on-save` differ from `debounced`; a status surface for the mode; the conformance
harness's endpoint mode (Phase 104).

</domain>

<decisions>
## Implementation Decisions

### The save-time bbjcpl run
- **D-01:** **While the latch is on, the `bbjcpl -N` run is skipped.** It is the same BBj parser
  as the endpoint, only run against the saved file instead of the live text, so with the
  endpoint live it adds only duplicates or stale results. With the latch off, bbjcpl runs and
  merges exactly as in 0.16.x (`mergeDiagnostics`, Rule 0), untouched. This reverses Phase 102
  D-03, as that decision anticipated.
- **D-02:** **Per-cycle fallback:** if the live parse *fails* in a debounce cycle (any failure
  kind from Phase 102 D-08: -33001..-33005, transport failure, malformed result) while the latch
  stays on, that cycle runs `bbjcpl` instead, as in 0.16.x. It adds no dialog; the Phase 102
  failure logging is unchanged. (Scouted: `BBjParserService.requestLiveParse()` currently
  returns `[]` for both "accepted" and "failed". The planner must give the caller a way to tell
  a verdict from a failure.)
- **D-03:** **A fallback bbjcpl result is not a verdict.** A fallback cycle behaves exactly like
  an older BBj: bbjcpl is merged as today and Langium's errors stay errors. Only a live endpoint
  verdict for the current text downgrades or replaces anything (D-04..D-08).

### Reach of the compiler's authority
- **D-04:** **Before BBj's verdict arrives, Langium's lexer, parser and line-break complaints
  show as errors, as today** (the user asked for this explicitly). **When the verdict arrives:**
  - on lines BBj flags, BBj's error replaces Langium's syntax complaint (D-09, D-10);
  - on lines BBj does not flag, Langium's syntax complaint stays visible but is **downgraded to
    Warning**. The user wants Langium's opinion kept on lines BBj is silent about. An accepted
    document therefore shows no language-server syntax *error* (PSRV-07) but may carry warnings.
  - "Syntax complaint" means Langium lexer errors, parser errors
    (`DocumentValidator.ParsingError`) and the line-break validator's diagnostics
    (`validations/line-break-validation.ts`: "needs to start in a new line", "needs to end
    with a line break" and its missing-terminator message). Scouted: line-break diagnostics
    carry no distinguishing `code` today, only the message text. The planner should tag them
    with a code rather than match on message prefixes.
  — **Reversibility:** reversible.
- **D-05:** **Linking and semantic diagnostics all stay visible**, even when Langium's own parse
  failed and its syntax errors were downgraded or replaced. Once a verdict exists, the hidden or
  downgraded Langium parse errors no longer trigger Rule 1's linking-error suppression. The user
  accepts that a partial Langium parse may surface extra linking warnings.
- **D-06:** **Rule 2 (any Error hides all warnings) never hides the downgraded syntax
  warnings.** Rule 2 keeps hiding other warnings (linking, validator warnings) while an error
  exists, as today.
- **D-07:** **Downgraded warnings keep their exact message text and Langium's own `source`**,
  distinct from `BBj Parser` and `BBjCPL`, so both IDEs show where they came from, and tests and
  the Phase 104 harness can tell them apart. There is no prefix or rewording.

### Before and between verdicts
- **D-08:** **No flicker while typing.** Each keystroke re-validates straight away, but the next
  verdict comes about 500 ms after typing stops. A Langium syntax complaint that the *previous*
  verdict downgraded stays a warning until the next verdict. It is matched by its message and
  its line's text, so line shifts from edits don't break the match. Only Langium complaints the
  last verdict hasn't seen show as errors in the meantime. With no verdict yet for a document
  (first open, latch off, fallback cycle), everything is as today.

### Which message wins on a line
- **D-09:** **On a line BBj flags, only Langium's syntax complaints give way.** BBj's diagnostic
  (its own text, source `BBj Parser`, Error, categories in `code`, as in Phase 102 D-09/D-10)
  remains. Langium's semantic and validator errors on the same line stay; they say something
  different.
- **D-10:** **"Same line" means overlapping line spans**, after Phase 102's PSRV-05 coordinate
  conversion: a Langium complaint gives way when any editor line of its range overlaps the
  editor lines of BBj's range. This covers colon-continued statements, where BBj reports on one
  line and Langium on another line of the same statement. It deliberately differs from
  `mergeDiagnostics`' start-line equality, which stays as-is for the latch-off bbjcpl path.

### Claude's Discretion
- Where the reconciliation lives: extend `applyDiagnosticHierarchy`/`validateDocument`, a new
  pure function applied in the debounce callback, or both (the D-08 carry-over must also run
  on the immediate per-keystroke validation). Keep it a pure, unit-testable function in the
  style of `mergeDiagnostics`.
- Where the per-document "last verdict" state lives and when it is cleared (document close,
  latch flipping to off, trigger `off`, connection reset per Phase 102 D-06).
- How Rule 3 (`maxErrors` cap) counts downgraded warnings (they are no longer errors). Rule 0 is
  unchanged for the latch-off path. Scouted: Rule 0 runs inside `validateDocument` before any
  `BBjCPL` diagnostics are merged, so it may never fire today. The researcher should confirm and
  note it, without changing latch-off behaviour.
- The Langium `source` label for downgraded warnings (whatever `getSource()` yields today is
  fine).
- Plan split. The obvious default: (1) the pure reconciliation function and its unit tests
  (downgrade, replace-by-overlap, Rule 1/2 exemptions, carry-over matching); (2) wiring into
  the builder: skip bbjcpl when the latch is on, verdict-vs-failure signal, per-cycle fallback,
  verdict state, plus a latch-off regression test proving 0.16.x behaviour against the
  old-server double; (3) the gated live check, the working conformance run, hand UAT in both
  IDEs with the endpoint present and with the pre-endpoint jar, then the branch and PR.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — "Phase 103" block (goal, four success criteria, ordering note), the
  Phase 104 block (formal exit gate) and the Phase 105 block (scheduling rework, not this phase)
- `.planning/REQUIREMENTS.md` — PSRV-06, PSRV-07 (owned here); PSRV-04 and PSRV-08 (the
  backward-compatibility and failure guarantees this phase must not break)
- `.planning/STATE.md` — "Active Constraints" (v4.5: probe, not version string; no proprietary
  text; branch + PR with register check)

### What Phase 102 built and left for this phase
- `.planning/phases/102-live-compiler-diagnostics-with-backward-compatibility/102-CONTEXT.md` —
  D-03 (bbjcpl left unchanged, reversed here by D-01), D-05/D-06 (per-connection latch), D-08
  (failure kinds), D-09 (`BBj Parser` source, kept out of Rule 0), D-10 (Error severity, BBj's
  text, categories in `code`), D-11 (clamped ranges), D-12 (`maxErrors`)
- `.planning/phases/102-live-compiler-diagnostics-with-backward-compatibility/102-VERIFICATION.md`
  and `102-UAT.md` — what was verified and the overlap that was accepted as expected
- `.planning/phases/101-bbj-parser-endpoint-in-bbj-ls/101-MR-DESCRIPTION.md` — the endpoint
  contract (error codes, `RequestCancelled`, coordinate convention)

### The code this phase changes
- `bbj-vscode/src/language/bbj-document-validator.ts` — `DiagnosticTier`, `getDiagnosticTier()`,
  `applyDiagnosticHierarchy()` (Rules 0-3), `mergeDiagnostics()`, `validateDocument()`
- `bbj-vscode/src/language/bbj-document-builder.ts` — `runBbjcplForDocuments()`,
  `debouncedCompile()` (bbjcpl then live parse, clear-then-show, single re-notify),
  `shouldCompileWithBbjcpl()`
- `bbj-vscode/src/language/bbj-parser-service.ts` — `BBJ_PARSER_SOURCE`, `isEnabled()` (the
  latch), `requestLiveParse()` (returns `[]` for both accepted and failed; see D-02)
- `bbj-vscode/src/language/validations/line-break-validation.ts` — the three line-break
  messages (D-04 tagging)
- `bbj-vscode/src/language/bbj-cpl-service.ts` — `bbjcpl -N` invocation (the path skipped by
  D-01 and kept for the fallback)
- `bbj-vscode/test/bbj-test-module.ts` — `JavaInteropTestService`, the scriptable
  `parseProgram` double from Phase 102 (old server by default; scripted results and errors)
- `bbj-vscode/test/test-helper.ts` — `RUN_BBJ_TESTS` gate for any live check

### Local environment
- `/opt/bbx` — BBj 26.02 with the Phase 101 `bbj-ls` jar in `/opt/bbx/.lib/bbjls/`; the
  pre-endpoint jar backup is for the latch-off hand check (see `101-CONTEXT.md` D-17)
- `CLAUDE.md` — "Shell and File-Access Rules" and the vitest cwd rule

No external specs beyond the Phase 101 MR text.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `applyDiagnosticHierarchy()` / `getDiagnosticTier()` — the tier model to extend with
  "verdict present" and "downgraded syntax warning" cases.
- `mergeDiagnostics()` — pure-function shape and its tests are the model for the new
  reconciliation function; it stays the latch-off merge.
- `debouncedCompile()` — already runs bbjcpl then the live parse in one callback with one
  re-notify; the latch-on branch skips bbjcpl there, and the fallback runs it on failure.
- Phase 102's scriptable `parseProgram` double — drives accepted, rejected and failed verdicts
  hermetically.

### Established Patterns
- Diagnostics are identified by `source` (`BBjCPL`, `BBj Parser`) and `data.code`
  (`ParsingError`, `LinkingError`); new tagging follows that, not message matching.
- Clear-then-show per debounce cycle; failures produce no diagnostic, only a log line.
- Tests: Vitest from `bbj-vscode/`; invented fixture programs with deliberate syntax errors
  live in test files, not under `test/test-data/`.

### Integration Points
- `validateDocument()` (immediate, per keystroke): apply the D-08 carry-over from the last
  verdict.
- `debouncedCompile()` (after 500 ms): the verdict arrives, D-04/D-09/D-10 reconciliation runs,
  and the state is stored for D-08.
- Latch/connection lifecycle (`isEnabled()`, Phase 102 D-06 resets): clear verdict state so the
  latch-off path is pristine 0.16.x.

</code_context>

<specifics>
## Specific Ideas

- The user explicitly wants Langium's voice kept: "We still need warnings of langium on lines
  that bbjcpl does not flag". Hence downgrade to warning, not removal, and the Rule 2 exemption.
- "Show an error by langium until the verdict arrives": immediate feedback is not delayed or
  held back; reconciliation happens only once BBj has spoken, and carries over between verdicts
  to avoid red-yellow-red flicker.
- Hand UAT needs both halves: endpoint present (duplicates gone, accepted file shows warnings
  only, no bbjcpl run) and the pre-endpoint jar swapped in (0.16.x behaviour exactly, including
  bbjcpl merge and Rule 0).
- Phase 104 note: downgraded Langium syntax *warnings* on compiler-accepted files are intended.
  The harness should count list B on error-severity language-server syntax diagnostics.

</specifics>

<deferred>
## Deferred Ideas

- A setting to hide the downgraded Langium syntax warnings entirely (strict "compiler only"
  mode). Not requested; possible later if the warnings prove noisy.
- Making `on-save` actually differ from `debounced` (carried over from Phase 102's deferred
  list).
- Moving live-parse scheduling out of `buildDocuments()`: Phase 105 (#692).

</deferred>

---

*Phase: 103-One Set of Errors — Diagnostic Reconciliation*
*Context gathered: 2026-09-22*
