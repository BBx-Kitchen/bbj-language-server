# Phase 129: IntelliJ Verdict - Context

**Gathered:** 2026-10-04
**Status:** Ready for planning

<domain>
## Phase Boundary

A recorded hands-on evaluation of LSP4IJ 0.21.0 formatting for BBj files, run on the built plugin
zip against a live BBj 26.03 BBjServices (IJF-02); the user's supported/disabled verdict at a
decision checkpoint, with `LSP_FORMATTING_ENABLED` in `BbjLanguageServerFactory` set to match
(IJF-03); and only on "supported", the 15 formatter settings on the IntelliJ BBj settings page,
reaching the server via `initializationOptions` with a restart on change (IJF-04). On "disabled",
IJF-04 moves to Out of Scope in `.planning/REQUIREMENTS.md` and no settings UI ships.

Not in this phase: hot-apply of settings (IJF-07, deferred), docs and QA checklists (Phase 130),
any bbj-ls change.

</domain>

<decisions>
## Implementation Decisions

### Carried forward (not re-asked)
- Phase 125 IJF-01: the single switch `LSP_FORMATTING_ENABLED` (currently `false`) gates
  `isEnabled`, `isSupported`, `isFormattingSupported` and `isRangeFormattingSupported` on the
  `LSPFormattingFeature` in `BbjLanguageServerFactory.createClientFeatures()`. Fence tests:
  `Lsp4ijCouplingCanaryTest`, `Lsp4ijOverrideSiteSourceGuardTest`.
- Phase 125 D-01..D-15: server-side message cadence (toast once, then log), dedup, Warning severity,
  fire-and-forget prompts, range edits accepted as snapped by bbj-ls, `indentWidth` default 2, all
  15 keys always sent with explicit values. The server already reads `initializationOptions.formatter`
  (an object, normalized by `normalizeFormatterSettings` in `bbj-format-settings.ts`) and omits it
  from the init log.
- Phase 125 D-05: invalid settings send `bbj/openFormatterSettings` (payload `{ keys }`); IntelliJ
  had no handler until now.
- Phase 126/128: the DENUM offer from the format path, `bbj/denum`, diagnostics in the BBj console;
  the IntelliJ Denumber action and banner already ship and do not depend on the verdict.
- Standing (v4.4 / memory): build both distributables (VSIX and IntelliJ zip) before the first hand
  check and again from the final tree after code-review fixes. Every runtime sequence used as
  evidence comes from a real `idea.log`, never a hand-derived trace. Any `bbj/*` request or
  `BbjLanguageClient` notification change runs `bbj-intellij ./gradlew test`.

### Evaluation method (IJF-02)
- **D-01:** Linux runs are **driven by Claude in a Gradle `runIde` sandbox** loaded with the built
  plugin zip (headful on the container display), against :5008 BBjServices 26.03. Claude opens
  files, triggers actions where possible and reads `idea.log` plus the BBj Language Server console
  after each case. Anything Claude cannot drive, the user clicks. Each row of the record cites real
  log lines.
- **D-02:** **Linux + Windows.** Claude writes a short Windows checklist (CRLF file, Reformat Code,
  Reformat selection, Actions on Save). The user runs it with the same built zip on Windows and
  returns the `idea.log`, and Claude adds it to the record.
- **D-03:** The seven IJF-02 cases (Reformat Code, selection, Actions on Save, numbered-file message,
  settings, CRLF, edit application) are run hands-on. The **extra cases are verified from code and
  existing tests, not hand-run**: `config.bbx` / BBx Config left untouched (FMT-12 guard; lsp4ij
  #1647), the commit-dialog reformat option, large file (apply time, caret/folding, one undo step,
  no dirty flag when already formatted), and server down / older BBj (bounded handler, no EDT
  freeze, one message). The record labels these rows **"code-verified"** and claims no runtime
  sequence for them.
- **D-04:** **Blocker bar: only data loss or a UI freeze blocks "supported".** Wrong or corrupted
  edits, a CRLF file silently not formatted, `config.bbx` rewritten, or an EDT freeze are
  blockers. Cosmetic findings (caret jump, extra dirty flag, highlighting refresh) go into the
  record as known issues.
- **D-05:** **Settings are evaluated through the seam before any UI exists.** Before the evaluation,
  build only the `FormatterInitOptions` seam (plain Java, like `CompilerInitOptions`) and the
  `BbjSettings.State` fields for the 15 keys, wired into `initializationOptions.formatter`. During
  the evaluation, set values in the sandbox's BBj settings XML, restart, and show from `idea.log`
  that format output follows them. On "disabled", the seam and state fields are reverted.

### Verdict shape (IJF-03)
- **D-06:** The verdict can be **"supported", "supported, no range formatting", or "disabled"**. If
  whole-file Reformat Code passes but range formatting hits a blocker, a second constant turns off
  only `isRangeFormattingSupported`, and the verdict names that exception. The fence tests pin both
  constants.
- **D-07:** A blocker in **Actions on Save or commit-dialog reformat means "disabled" overall**.
  LSP4IJ cannot switch format-on-save off on its own, so there is no partial verdict for the save
  path.
- **D-08:** At the decision checkpoint **Claude presents the record, the blockers measured against
  D-04, and a recommended verdict, and the user decides** (confirms or overrides). The verdict and
  its evidence are recorded in the phase directory; the switch constant(s) are set to match.

### Settings page (IJF-04, only on "supported")
- **D-09:** A new **"Formatter" `TitledSeparator` section on the existing BBj settings page**
  (`BbjSettingsComponent`), placed after "BBj Compiler". No separate configurable, no Code Style
  page.
- **D-10:** **Controls mirror the VS Code schema** in `bbj-vscode/package.json`: `indentWidth` as a
  bounded spinner, booleans as checkboxes, enums as combos with the same values, and the
  package.json descriptions as tooltips. Defaults match `FORMATTER_DEFAULTS` (`indentWidth` 2). No
  free-text fields, so no null or blank value can reach bbj-ls (`-33007`).
- **D-11:** **Restart uses the existing debounced restart on Apply** (`BbjSettingsConfigurable`), the
  same as every other BBj setting. A short note under the section says the values apply after the
  language server restarts. No confirmation dialog.
- **D-12:** **`bbj/openFormatterSettings` opens the BBj settings page** through a
  `@JsonNotification` handler on `BbjLanguageClient` (scrolled to the Formatter section if cheap).
  The payload `keys` are never used as a path, command or link. On "disabled", leave the
  notification unhandled, as it is today.

### Disabled outcome
- **D-13:** On "disabled", **nothing new appears in the IDE**: no balloon, no banner, and Reformat
  Code behaves as today. Phase 130's IntelliJ guide says formatting is VS Code-only for now.
- **D-14:** On "disabled", **keep `LSP_FORMATTING_ENABLED = false` and its fence tests**, and update
  its javadoc to point to the evaluation record and its blockers, so a later LSP4IJ upgrade can
  re-check by flipping one constant. The evaluation record stays in the phase directory.
- **D-15:** For each **blocker caused by LSP4IJ, Claude drafts a minimal-repro upstream issue** in
  the phase directory (as for lsp4ij #1672/#1673); the user decides whether and when to file it.

### Claude's Discretion
- File name and layout of the evaluation record (one row per case: steps, expected, observed,
  `idea.log` excerpt or code reference, pass / known issue / blocker).
- How `runIde` is driven (display/VNC, sandbox config dir, how the sandbox BBj settings XML is
  seeded) and which test corpus files are used (prefer real programs from `examples/` and a CRLF
  copy).
- Name of the range-only constant and how the fence tests pin two constants.
- Ordering of the 15 controls within the Formatter section, spinner bounds (take them from
  package.json), and the restart-note wording.
- Whether the seam (D-05) lives in a new `FormatterInitOptions` class in `lsp/`, by analogy with
  `CompilerInitOptions`.

### Folded Todos
- **IntelliJ sends `javaInteropHost`/`javaInteropPort`, but the language server reads
  `interopHost`/`interopPort`** (`.planning/todos/pending/2026-09-26-intellij-interop-initoptions-key-mismatch.md`).
  `BbjLanguageServerFactory` (lines ~64-67) puts the `javaInterop*` keys into
  `initializationOptions`, while `bbj-ws-manager.ts` only reads `interopHost`/`interopPort`, so
  IntelliJ's configured interop host/port never reach the server at initialize. Fixed in this phase
  because it touches the same `initializationOptions` build as D-05. The fix applies regardless of
  the verdict. The planner picks the direction (rename on the IntelliJ side, or accept both
  server-side) and checks whether anything relies on the old key names. Close the todo when done.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 129 goal and success criteria; v4.9 "Where each phase works",
  "Research flags" (129: LSP4IJ 0.21.0 runtime behaviour) and "Verification" notes
- `.planning/REQUIREMENTS.md` — IJF-02, IJF-03, IJF-04 (and IJF-07 deferred)
- `.planning/research/PITFALLS.md` — Pitfall 2 (switch), 5 (CRLF, lsp4ij #381), 14 (IntelliJ
  settings channel is initialization-only), 15 (LSP4IJ formatting quirks; evaluation checklist),
  16 (config.bbx and non-source inputs), 18 (`ComposerRequestContractTest` and cross-language gates)
- `.planning/research/ARCHITECTURE.md` — formatter/handler design the evaluation exercises

### Prior phase decisions
- `.planning/phases/125-ls-formatting/125-CONTEXT.md` — D-01..D-15, IJF-01 switch
- `.planning/phases/126-ls-denum/` — DENUM offer from the format path (numbered-file message case)
- `.planning/phases/128-intellij-denum/128-CONTEXT.md` — IntelliJ DENUM action, banner, console

### bbj-ls contract
- `/home/coder/repos/bbj-ls/bbj-ls-formatter/README.md` — "Settings reference" (15 keys, types, values)
- `/home/coder/repos/bbj-ls/README.md` — "JSON-RPC methods" (`formatProgram`, `denumProgram`)

### Code
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` — the switch,
  `initializationOptions` build, interop key mismatch
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/CompilerInitOptions.java` — seam pattern for D-05
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java`, `BbjSettingsComponent.java`,
  `BbjSettingsConfigurable.java` — settings state, page sections, restart on apply
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java` — notification handlers (D-12)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java`,
  `Lsp4ijOverrideSiteSourceGuardTest.java` — fence tests for the switch
- `bbj-vscode/src/language/bbj-format-settings.ts` — 15 keys, `FORMATTER_DEFAULTS`, normalizer
- `bbj-vscode/src/language/bbj-ws-manager.ts` — `initializationOptions` intake (`formatter`, `interopHost`/`interopPort`)
- `bbj-vscode/src/language/bbj-format-service.ts` — `openFormatterSettings` notification
- `bbj-vscode/package.json` — `bbj.formatter.*` schema the IntelliJ controls mirror (D-10)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CompilerInitOptions`: plain-Java, unit-testable seam for flat `initializationOptions` keys; the model for `FormatterInitOptions`.
- `BbjSettingsConfigurable`'s debounced language-server restart on apply: already re-sends fresh `initializationOptions`.
- `TitledSeparator` + `addLabeledComponent` form builder in `BbjSettingsComponent`: one more section.
- `normalizeFormatterSettings` on the server: already whitelists the 15 keys and fills defaults, so IntelliJ may send a partial object safely.

### Established Patterns
- IntelliJ settings reach the server only through flat `initializationOptions` (LSP4IJ settings push/pull is not wired for BBj).
- LSP4IJ client features are overridden in `createClientFeatures()`; source-guard tests pin the override sites.
- `@JsonNotification` handlers on `BbjLanguageClient` for `bbj/*` server notifications (Phase 128).

### Integration Points
- `BbjLanguageServerFactory` `initializationOptions` block: add `formatter` object (D-05) and fix the interop key names (folded todo).
- `LSP_FORMATTING_ENABLED` (+ optional range-only constant, D-06): set at the checkpoint.
- `BbjLanguageClient`: `bbj/openFormatterSettings` handler (D-12, only on "supported").

</code_context>

<specifics>
## Specific Ideas

- The evaluation follows the order: build both distributables → seam in → `runIde` Linux cases →
  Windows checklist handed to the user → record → decision checkpoint → (supported) settings page +
  handler + UAT from the final zip, or (disabled) revert seam, IJF-04 to Out of Scope, javadoc and
  issue drafts.
- Upstream issue drafts follow the lsp4ij #1672/#1673 style: minimal repro, LSP4IJ version, log excerpt.

</specifics>

<deferred>
## Deferred Ideas

- Hot-apply of IntelliJ formatter settings without a restart: IJF-07, already deferred.
- A one-time "formatting not supported in IntelliJ" balloon: rejected in favour of D-13.

### Reviewed Todos (not folded)
- Peer-supplied Java names breaking out of the signature-help code fence / snippet variables: security area, unrelated to formatting.
- Re-check the IntelliJ Node.js download progress bar on Windows: separate Windows check, not part of the formatting evaluation.
- Move lsp4j.jsonrpc to 1.0 in bbj-ls first, then java-interop: dependency work, unrelated.

</deferred>

---

*Phase: 129-intellij-verdict*
*Context gathered: 2026-10-04*
