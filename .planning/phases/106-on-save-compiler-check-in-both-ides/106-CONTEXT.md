# Phase 106: On-Save Compiler Check in Both IDEs - Context

**Gathered:** 2026-09-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Make `bbj.compiler.trigger = on-save` do what its name says, in VS Code and IntelliJ alike:
opening or saving a BBj file runs exactly one compiler check (the live parse first, bbjcpl
when the live parse is unavailable). Typing runs no compiler work, and the last check's
errors stay visible until the next save. `debounced` (still the default) and `off` behave as
before. IntelliJ gets the setting. The VS Code setting description and both feature docs
describe the three modes as implemented.

The phase also covers two changes next to this one:
- **DIAG-01:** when bbjcpl stands in for the live parse, a redundant Langium parse error for
  the same finding is suppressed, in every mode.
- **JINT-03:** the live parse no longer waits on the shared interop connection or its circuit
  breaker before using its own connection.

Changing the default trigger and adding any new feature are out of scope (REQUIREMENTS.md
"Out of Scope").

</domain>

<decisions>
## Implementation Decisions

### Old compiler errors while typing under on-save (TRIG-04)
- **D-01:** **A compiler error from the last check stays until the next save replaces it**,
  even when the user edits or fixes its line. It follows its line through inserts and deletes
  above it and is dropped only when its line is deleted. This applies to errors from either
  source (`BBj Parser` verdict or bbjcpl fallback). The Phase 105 "latest text version wins"
  stale guard (105 D-07, the `versionBeforeRequest` check in `debouncedCompile()`) must
  therefore not throw away an on-save verdict just because the text moved on after the save.
  Under `debounced` that guard is unchanged.
- **D-02:** **Langium syntax complaints on text the last check never saw show as errors**
  (lines typed or changed since the save), as 103 D-04/D-08 already do before a verdict.
  Under on-save, Langium is the only thing checking new code between saves.
- **D-03:** **The 103 D-08 carry-over lasts until the next save.** A Langium complaint the
  last verdict downgraded to warning, or replaced with BBj's error on an overlapping line,
  keeps that treatment while the user types, matched by message and line text as today. It
  is no longer limited to the ~500 ms gap it was built for.
- **D-04:** **On an edited line that keeps the last save's BBj error, a new Langium complaint
  about the new text shows as well** (both are visible). 103 D-09's give-way rule covers only
  complaints the verdict actually saw (matched by line text), not complaints on the same line
  position about text BBj never checked.

### What starts a check under on-save (TRIG-01/02/03)
- **D-05:** **Every save runs one check, even when the text is unchanged** since the last
  check. Ctrl+S is the user's way to say "check now".
- **D-06:** **Under on-save, only opening and saving the file itself start a check.** A
  rebuild of an open document for any other reason (another file saved, a relink, a
  `config.bbx` change) reruns Langium only, and the last verdict stays. This departs from
  105 D-03 for on-save only. Under `debounced` the rebuild-driven trigger is unchanged.
  Opening a file during the startup build still checks it early (105 D-02). The open gate
  (`shouldCompileWithBbjcpl`) still applies.
- **D-07:** **Auto-saves count as saves.** `didSave` carries no reason, so VS Code's
  `files.autoSave: afterDelay` makes on-save behave close to debounced. The docs say so in
  one line. The server does not try to detect or skip auto-saves.
- **D-08:** **Switching modes at runtime keeps each open file's current results.** Switching
  to on-save keeps the current compiler errors until the file's next save. Switching to
  debounced lets the next edit start a check as usual. Switching to off clears them as today
  (`runBbjcplForDocuments`' off branch). There is no burst of checks when the mode changes.

### bbjcpl fallback dedup (DIAG-01)
- **D-09:** **When bbjcpl stands in for the live parse, a Langium syntax complaint gives way
  only when its line span overlaps a bbjcpl error's line span**, the same overlap rule the
  live path uses (103 D-10). "Syntax complaint" means what it means in 103 D-04: lexer
  errors, parser errors and the line-break validator's diagnostics. Langium complaints on
  other lines stay errors, with no downgrade. **103 D-03 ("a fallback bbjcpl result is not a
  verdict") holds for everything else.** Rule 0 as written in `applyDiagnosticHierarchy`
  (any BBjCPL error hides every parse error in the file) is **not** what gets switched on.
- **D-10:** **On an overlapping line, bbjcpl's own diagnostic shows**, with its own text and
  source `BBjCPL`, just as the live path shows BBj's text (103 D-09). This replaces
  `mergeDiagnostics`' current same-start-line relabel, which keeps Langium's message and only
  changes the source. Langium's semantic and validator errors on that line stay (103 D-09).
- **D-11:** **The dedup applies only when the text bbjcpl checked equals the editor text.**
  That is always true right after a save, so on-save is always covered. Under debounced with
  unsaved edits, bbjcpl (which reads the file on disk) is merged as today with no
  suppression, so a line number from a stale check can never hide a real error.

### IntelliJ setting and docs (TRIG-06/07)
- **D-12:** **IntelliJ delivers the trigger through `initializationOptions`**, with the key the
  server already reads for VS Code (`compilerTrigger` in `bbj-ws-manager.ts`). A change takes
  effect through the debounced language-server restart that every settings Apply already
  schedules (`BbjSettingsConfigurable.apply()` → `BbjServerService.scheduleRestart()`). There
  is no live `didChangeConfiguration` path for IntelliJ, for the reason #571 found:
  LSP4IJ's settings resolution returns null for this plugin's flat settings.
- **D-13:** **The IntelliJ UI is a "Compiler check:" dropdown (Debounced / On save / Off)
  under the existing "BBj Compiler" separator**, next to "Compile output directory". A
  one-line hint below it recommends On save for large workspaces. Default: Debounced.
- **D-14:** **The docs and the VS Code setting description replace the "set off if
  completion is slow" advice with a recommendation of on-save for large workspaces.** `off`
  is described plainly (no compiler checks at all), not as a slowness workaround. The
  auto-save interplay (D-07) gets one line. The IntelliJ doc's "no IntelliJ equivalent"
  paragraph goes. The `on-save` enumDescription ("currently behaves the same as debounced")
  is rewritten to match the behaviour.

### Claude's Discretion
- How the server learns of saves: check whether both clients send `textDocument/didSave`
  today (VS Code via vscode-languageclient, IntelliJ via LSP4IJ) and whether the server
  advertises `save` in its text-document sync capability. Wire it wherever fits
  (a `TextDocuments.onDidSave` listener next to 105's event arming, or similar). The
  constraint from 105 still holds: arming a check must not wait on `workspaceLock`.
- How a "kept" verdict is stored and re-placed on shifted lines (D-01). Options include
  per-line text anchors like 103 D-08, or mapping through content changes. It must stay a
  pure, unit-testable function in the style of `bbj-diagnostic-reconciliation.ts`.
- How to tell "the checked text equals the editor text" for D-11 (compare the text read for
  compile with `textDocument.getText()`, or track the saved version).
- What happens to a check still in flight when the next save arrives: a newer save
  supersedes it, and the result for the older save must not overwrite the newer one.
- JINT-03 mechanics: let the dedicated lane (`openParseLane`) connect on its own,
  independent of the shared connection's breaker state, falling back to the shared
  connection only when the lane cannot be opened (105 D-10, logged once). Keep the constraint
  from 105: a reset of either connection clears verdict state, and the latch still reflects
  whether the endpoint exists.
- `hasPendingWork()` / `hasPendingCompile()` semantics under on-save (#486 config-reload
  quiescence).
- Plan split. The obvious default:
  (1) server on-save scheduling (save/open arming, no rebuild or typing triggers, kept verdict
  across edits) with vitest guards using the scriptable `parseProgram` double;
  (2) DIAG-01 dedup on the bbjcpl fallback path;
  (3) JINT-03 lane independence, with a test in `test/java-interop-parse-lane.test.ts` where
  the shared breaker is open or half-open and the lane still answers;
  (4) the IntelliJ setting and init option, the VS Code description, both feature docs;
  (5) hand UAT in both IDEs from freshly built VSIX and IntelliJ zip, and the criterion-5
  timing re-check of a few Phase 105 "after" samples on the real large workspace (numbers
  and environment notes only, no corpus names, as in 105 D-11).

### Folded Todos
- **"Live parse still waits on the shared interop connection (and its circuit breaker)
  before using its own"** (`.planning/todos/pending/2026-09-23-live-parse-waits-on-shared-connection-breaker.md`,
  from 105-REVIEW.md WR-01). This todo is JINT-03 itself: `parseProgram()` awaits the shared
  `connect()` and its breaker before trying the dedicated lane. It was deferred from 105
  because fixing it changes the transport the timings were measured through. Criterion 5's
  re-check covers that.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and requirements
- `.planning/ROADMAP.md` — the "Phase 106" block: goal, five success criteria, planning notes
  (check `didSave` from both clients; the stale-verdict drop vs TRIG-04; JINT-03 re-check)
- `.planning/REQUIREMENTS.md` — TRIG-01..07, DIAG-01, JINT-03; "Out of Scope" (default
  trigger stays `debounced`)
- `.planning/STATE.md` — Active Constraints (branch + PR, register check, no proprietary
  corpus text)
- GitHub issue **#696** (`gh issue view 696`) — the on-save trigger request
- GitHub issue **#522** (`gh issue view 522`) — the bbjcpl-path hierarchy gap DIAG-01 fixes
  (its "proposed approach" = Rule 0 literally, which D-09 deliberately does NOT adopt)

### Decisions this phase builds on (v4.5, archived)
- `.planning/milestones/v4.5-phases/103-one-set-of-errors-diagnostic-reconciliation/103-CONTEXT.md`
  — D-01..D-03 (bbjcpl skipped while latched, per-cycle fallback, fallback is not a verdict),
  D-04..D-10 (reconciliation; D-08 carry-over; D-10 line-span overlap)
- `.planning/milestones/v4.5-phases/105-live-diagnostics-responsiveness-on-large-workspaces/105-CONTEXT.md`
  — D-02/D-03 (event- and rebuild-armed cycle), D-04..D-07 (early publish, latest version
  wins), D-09/D-10 (dedicated parse lane with fallback)
- `.planning/milestones/v4.5-phases/105-live-diagnostics-responsiveness-on-large-workspaces/105-MEASUREMENT.md`
  — the "after" timings criterion 5 re-checks (5.3 s VS Code, 6 s IntelliJ) and how they were
  taken
- `.planning/milestones/v4.5-phases/105-live-diagnostics-responsiveness-on-large-workspaces/105-REVIEW.md`
  — WR-01 (JINT-03's origin)

### Code this phase changes
- `bbj-vscode/src/language/bbj-document-builder.ts` — `runBbjcplForDocuments()`,
  `debouncedCompile()` (stale guard, bbjcpl fallback branch with `mergeDiagnostics`),
  `armLiveParseFromEvent()`, `forgetVerdict()`, `latestLangiumBaseline()`, `hasPendingWork()`
- `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` — `composeWithVerdict()`,
  verdict state, carry-over matching
- `bbj-vscode/src/language/bbj-document-validator.ts` — `mergeDiagnostics()`,
  `applyDiagnosticHierarchy()` (Rule 0 note), `getCompilerTrigger()`/`setCompilerTrigger()`
- `bbj-vscode/src/language/java-interop.ts` — `parseProgram()`, `openParseLane()`,
  `connect()`/breaker
- `bbj-vscode/src/language/main.ts` — `onDidChangeConfiguration` (trigger applied live)
- `bbj-vscode/src/language/bbj-ws-manager.ts` — `initializationOptions.compilerTrigger`
- `bbj-vscode/src/extension.ts` — client `initializationOptions` / `synchronize`
- `bbj-vscode/package.json` — `bbj.compiler.trigger` enumDescriptions
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java`,
  `BbjSettingsComponent.java`, `BbjSettingsConfigurable.java`,
  `lsp/BbjLanguageServerFactory.java` (`initializeParams`), `CompilerInitOptions`
- `documentation/docs/vscode/features.md`, `documentation/docs/intellij/features.md` —
  compiler-check sections

### Tests to extend
- `bbj-vscode/test/bbj-test-module.ts` — scriptable `parseProgram` double
- `bbj-vscode/test/java-interop-parse-lane.test.ts` — lane tests (JINT-03)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getCompilerTrigger()` already models `'debounced' | 'on-save' | 'off'`. Both config
  paths (init options and `didChangeConfiguration`) already accept `on-save`. Only the
  behaviour is missing.
- `composeWithVerdict()` and the 103 carry-over (message + line text matching) are the base
  for D-01..D-04.
- The 103 D-10 line-span overlap logic is the base for D-09.
- `CompilerInitOptions` plus the flat init-option key in `BbjLanguageServerFactory` are the
  pattern for D-12 (#571's `compilerOutputDirectory` went the same way).

### Established Patterns
- Diagnostic composition is pure and unit-tested (`mergeDiagnostics`, reconciliation). New
  logic follows that style.
- Every publish is re-derived from one snapshot (105 D-07). There is no appending to or
  stripping from `document.diagnostics`.
- IntelliJ settings changes restart the server through `BbjServerService.scheduleRestart()`.

### Integration Points
- No `didSave` handler exists in `bbj-vscode/src/language/` today. The researcher must
  confirm what both clients send and what the server advertises.
- `runBbjcplForDocuments()` (the rebuild-driven trigger) and `armLiveParseFromEvent()` (the
  event trigger) both feed the per-document `cplDebounceTimers`. Under on-save, neither may
  start a check on typing or rebuild. Save and open start one without the 500 ms debounce.

</code_context>

<specifics>
## Specific Ideas

- Ctrl+S on an unchanged file is the "check now" gesture (D-05).
- Hand UAT runs in both IDEs from a freshly built VSIX and IntelliJ zip, built from the
  final tree after code-review fixes.

</specifics>

<deferred>
## Deferred Ideas

None. The discussion stayed within the phase's scope.

### Reviewed Todos (not folded)
- "linking.test.ts Interop related tests fail even after a targeted class warm-up": this is
  env drift in tests, not phase scope.
- "A lost language-server connection is invisible to the plugin's crash detection" and "The
  server status log line prints a stale previous status": Phase 108 (LIFE-01/02).
- "Phase 97 code-review follow-ups": future requirements, not in the v4.6 roadmap.
- "Loosen single-line IF balance rule" and "checkUseBeforeAssignment throws on a reference
  without a symbol": Phase 107 (VAL-01/02).

</deferred>

---

*Phase: 106-on-save-compiler-check-in-both-ides*
*Context gathered: 2026-09-24*
